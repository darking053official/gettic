// main.rs - Gettic Rust Backend
// Cargo.toml:
// [dependencies]
// actix-web = "4"
// actix-ws = "0.3"
// mongodb = "2"
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"
// bson = { version = "2", features = ["chrono-0_4"] }
// bcrypt = "0.15"
// rand = "0.8"
// tokio = { version = "1", features = ["full"] }
// chrono = { version = "0.4", features = ["serde"] }
// uuid = { version = "1", features = ["v4"] }
// jsonwebtoken = "9"

use actix_web::{web, App, HttpServer, HttpRequest, HttpResponse, middleware};
use actix_cors::Cors;
use mongodb::{Client, Collection, bson::{doc, oid::ObjectId, DateTime as BsonDateTime}};
use serde::{Deserialize, Serialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::Rng;
use chrono::Utc;
use std::sync::Mutex;
use std::collections::HashMap;

// ============ MODELS ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub username: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub avatar: Option<String>,
    pub status: Option<String>,
    pub bio: Option<String>,
    pub badges: Vec<String>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content: String,
    pub sender: Option<ObjectId>,
    pub sender_name: String,
    pub room: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub edited: bool,
    pub is_bot: bool,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Server {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub owner: Option<ObjectId>,
    pub icon: Option<String>,
    pub invite_code: String,
    pub members: Vec<ObjectId>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Channel {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub server: ObjectId,
    #[serde(rename = "type")]
    pub channel_type: String,
    pub topic: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Webhook {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub server: ObjectId,
    pub channel: ObjectId,
    pub token: String,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bot {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub owner: Option<ObjectId>,
    pub prefix: String,
    pub description: Option<String>,
    pub token: String,
    pub is_online: bool,
    pub commands: Vec<BotCommand>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BotCommand {
    pub name: String,
    pub response: String,
}

// ============ REQUEST BODIES ============

#[derive(Deserialize)]
pub struct RegisterBody {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginBody {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateServerBody {
    pub name: String,
    pub template: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateChannelBody {
    pub name: String,
    #[serde(rename = "type")]
    pub channel_type: Option<String>,
    pub topic: Option<String>,
}

#[derive(Deserialize)]
pub struct SendMessageBody {
    pub content: String,
}

#[derive(Deserialize)]
pub struct CreateWebhookBody {
    pub name: String,
    pub server_id: String,
    pub channel_id: String,
}

#[derive(Deserialize)]
pub struct CreateBotBody {
    pub name: String,
    pub prefix: Option<String>,
}

#[derive(Deserialize)]
pub struct WebhookSendBody {
    pub content: String,
    pub username: Option<String>,
}

// ============ HELPERS ============

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..16).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

fn json_ok<T: Serialize>(data: T) -> HttpResponse {
    HttpResponse::Ok().json(data)
}

fn json_created<T: Serialize>(data: T) -> HttpResponse {
    HttpResponse::Created().json(data)
}

fn json_error(msg: &str, status: actix_web::http::StatusCode) -> HttpResponse {
    HttpResponse::build(status).json(serde_json::json!({ "error": msg }))
}

// ============ APP STATE ============

pub struct AppState {
    pub db: mongodb::Database,
    pub ws_clients: Mutex<HashMap<String, Vec<actix_ws::Session>>>,
}

// ============ HANDLERS ============

// Auth
async fn register(
    state: web::Data<AppState>,
    body: web::Json<RegisterBody>,
) -> HttpResponse {
    let users: Collection<User> = state.db.collection("users");

    if body.username.len() < 3 || body.password.len() < 6 {
        return json_error("Kullanıcı adı en az 3, şifre en az 6 karakter", actix_web::http::StatusCode::BAD_REQUEST);
    }

    let existing = users.find_one(doc! { "username": &body.username }, None).await;
    if let Ok(Some(_)) = existing {
        return json_error("Bu kullanıcı adı alınmış", actix_web::http::StatusCode::BAD_REQUEST);
    }

    let hashed = hash(&body.password, DEFAULT_COST).unwrap_or_default();

    let user = User {
        id: None,
        username: body.username.clone(),
        password: hashed,
        avatar: None,
        status: Some("online".to_string()),
        bio: None,
        badges: vec!["Üye".to_string()],
        created_at: Utc::now(),
    };

    let result = users.insert_one(user, None).await.unwrap();
    let inserted_id = result.inserted_id.as_object_id().unwrap();

    let created_user = users.find_one(doc! { "_id": inserted_id }, None).await.unwrap().unwrap();

    json_created(serde_json::json!({
        "user": {
            "_id": created_user.id.unwrap().to_hex(),
            "username": created_user.username,
            "status": created_user.status,
            "badges": created_user.badges,
            "createdAt": created_user.created_at
        },
        "token": generate_token()
    }))
}

async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginBody>,
) -> HttpResponse {
    let users: Collection<User> = state.db.collection("users");

    let user = users.find_one(doc! { "username": &body.username }, None).await;
    match user {
        Ok(Some(u)) => {
            if verify(&body.password, &u.password).unwrap_or(false) {
                json_ok(serde_json::json!({
                    "user": {
                        "_id": u.id.unwrap().to_hex(),
                        "username": u.username,
                        "status": u.status,
                        "badges": u.badges,
                        "createdAt": u.created_at
                    },
                    "token": generate_token()
                }))
            } else {
                json_error("Şifre hatalı", actix_web::http::StatusCode::BAD_REQUEST)
            }
        }
        _ => json_error("Kullanıcı bulunamadı", actix_web::http::StatusCode::BAD_REQUEST)
    }
}

// Servers
async fn get_servers(state: web::Data<AppState>) -> HttpResponse {
    let servers: Collection<Server> = state.db.collection("servers");
    let mut cursor = servers.find(None, None).await.unwrap();
    let mut result = Vec::new();
    use futures::StreamExt;
    while let Some(server) = cursor.next().await {
        if let Ok(s) = server { result.push(s); }
    }
    json_ok(result)
}

async fn create_server(
    state: web::Data<AppState>,
    body: web::Json<CreateServerBody>,
) -> HttpResponse {
    if body.name.is_empty() {
        return json_error("Sunucu adı gerekli", actix_web::http::StatusCode::BAD_REQUEST);
    }

    let servers: Collection<Server> = state.db.collection("servers");
    let channels: Collection<Channel> = state.db.collection("channels");

    let invite_code = generate_token()[..8].to_string();

    let server = Server {
        id: None,
        name: body.name.clone(),
        owner: None,
        icon: None,
        invite_code: invite_code.clone(),
        members: vec![],
        created_at: Utc::now(),
    };

    let result = servers.insert_one(server, None).await.unwrap();
    let server_id = result.inserted_id.as_object_id().unwrap();

    // Default channels
    for ch_name in &["genel", "sesli"] {
        let channel = Channel {
            id: None,
            name: ch_name.to_string(),
            server: server_id,
            channel_type: if *ch_name == "sesli" { "voice".to_string() } else { "text".to_string() },
            topic: None,
            created_at: Utc::now(),
        };
        channels.insert_one(channel, None).await.unwrap();
    }

    let created = servers.find_one(doc! { "_id": server_id }, None).await.unwrap().unwrap();
    json_created(created)
}

// Channels
async fn get_channels(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let server_id = ObjectId::parse_str(path.as_str()).unwrap();
    let channels: Collection<Channel> = state.db.collection("channels");
    let mut cursor = channels.find(doc! { "server": server_id }, None).await.unwrap();
    let mut result = Vec::new();
    use futures::StreamExt;
    while let Some(ch) = cursor.next().await {
        if let Ok(c) = ch { result.push(c); }
    }
    json_ok(result)
}

async fn create_channel(
    state: web::Data<AppState>,
    path: web::Path<String>,
    body: web::Json<CreateChannelBody>,
) -> HttpResponse {
    let server_id = ObjectId::parse_str(path.as_str()).unwrap();
    let channels: Collection<Channel> = state.db.collection("channels");

    let channel = Channel {
        id: None,
        name: body.name.clone(),
        server: server_id,
        channel_type: body.channel_type.clone().unwrap_or("text".to_string()),
        topic: body.topic.clone(),
        created_at: Utc::now(),
    };

    let result = channels.insert_one(channel, None).await.unwrap();
    let created = channels.find_one(doc! { "_id": result.inserted_id.as_object_id().unwrap() }, None).await.unwrap().unwrap();
    json_created(created)
}

// Messages
async fn get_messages(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let channel_id = path.into_inner();
    let messages: Collection<Message> = state.db.collection("messages");
    let mut cursor = messages.find(doc! { "room": &channel_id }, None).await.unwrap();
    let mut result = Vec::new();
    use futures::StreamExt;
    while let Some(msg) = cursor.next().await {
        if let Ok(m) = msg { result.push(m); }
    }
    result.reverse();
    json_ok(result)
}

async fn send_message(
    state: web::Data<AppState>,
    path: web::Path<String>,
    body: web::Json<SendMessageBody>,
) -> HttpResponse {
    let channel_id = path.into_inner();
    let messages: Collection<Message> = state.db.collection("messages");

    let msg = Message {
        id: None,
        content: body.content.clone(),
        sender: None,
        sender_name: "Kullanıcı".to_string(),
        room: channel_id,
        msg_type: "text".to_string(),
        edited: false,
        is_bot: false,
        created_at: Utc::now(),
    };

    let result = messages.insert_one(msg, None).await.unwrap();
    let created = messages.find_one(doc! { "_id": result.inserted_id.as_object_id().unwrap() }, None).await.unwrap().unwrap();
    json_created(created)
}

// Webhooks
async fn get_webhooks(state: web::Data<AppState>) -> HttpResponse {
    let webhooks: Collection<Webhook> = state.db.collection("webhooks");
    let mut cursor = webhooks.find(None, None).await.unwrap();
    let mut result = Vec::new();
    use futures::StreamExt;
    while let Some(wh) = cursor.next().await {
        if let Ok(w) = wh { result.push(w); }
    }
    json_ok(result)
}

async fn create_webhook(
    state: web::Data<AppState>,
    body: web::Json<CreateWebhookBody>,
) -> HttpResponse {
    let server_id = ObjectId::parse_str(&body.server_id).unwrap();
    let channel_id = ObjectId::parse_str(&body.channel_id).unwrap();
    let token = generate_token();

    let webhooks: Collection<Webhook> = state.db.collection("webhooks");
    let webhook = Webhook {
        id: None,
        name: body.name.clone(),
        server: server_id,
        channel: channel_id,
        token: token.clone(),
        created_at: Utc::now(),
    };

    let result = webhooks.insert_one(webhook, None).await.unwrap();
    let created = webhooks.find_one(doc! { "_id": result.inserted_id.as_object_id().unwrap() }, None).await.unwrap().unwrap();
    json_created(created)
}

async fn webhook_send(
    state: web::Data<AppState>,
    path: web::Path<String>,
    body: web::Json<WebhookSendBody>,
) -> HttpResponse {
    let token = path.into_inner();
    let webhooks: Collection<Webhook> = state.db.collection("webhooks");
    let webhook = webhooks.find_one(doc! { "token": &token }, None).await;

    match webhook {
        Ok(Some(wh)) => {
            let messages: Collection<Message> = state.db.collection("messages");
            let msg = Message {
                id: None,
                content: body.content.clone(),
                sender: None,
                sender_name: body.username.clone().unwrap_or(wh.name),
                room: wh.channel.to_hex(),
                msg_type: "text".to_string(),
                edited: false,
                is_bot: true,
                created_at: Utc::now(),
            };
            let result = messages.insert_one(msg, None).await.unwrap();
            let created = messages.find_one(doc! { "_id": result.inserted_id.as_object_id().unwrap() }, None).await.unwrap().unwrap();
            json_ok(created)
        }
        _ => json_error("Webhook bulunamadı", actix_web::http::StatusCode::NOT_FOUND)
    }
}

// Bots
async fn get_bots(state: web::Data<AppState>) -> HttpResponse {
    let bots: Collection<Bot> = state.db.collection("bots");
    let mut cursor = bots.find(None, None).await.unwrap();
    let mut result = Vec::new();
    use futures::StreamExt;
    while let Some(bot) = cursor.next().await {
        if let Ok(b) = bot { result.push(b); }
    }
    json_ok(result)
}

async fn create_bot(
    state: web::Data<AppState>,
    body: web::Json<CreateBotBody>,
) -> HttpResponse {
    let token = generate_token();
    let bots: Collection<Bot> = state.db.collection("bots");

    let bot = Bot {
        id: None,
        name: body.name.clone(),
        owner: None,
        prefix: body.prefix.clone().unwrap_or("/".to_string()),
        description: None,
        token: token.clone(),
        is_online: false,
        commands: vec![
            BotCommand { name: "ping".to_string(), response: "Pong!".to_string() },
            BotCommand { name: "yardim".to_string(), response: "/ping, /sa, /temizle".to_string() },
        ],
        created_at: Utc::now(),
    };

    let result = bots.insert_one(bot, None).await.unwrap();
    let created = bots.find_one(doc! { "_id": result.inserted_id.as_object_id().unwrap() }, None).await.unwrap().unwrap();
    json_created(created)
}

// Health
async fn health() -> HttpResponse {
    json_ok(serde_json::json!({ "status": "ok", "uptime": Utc::now().timestamp() }))
}

// ============ MAIN ============

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let mongo_uri = std::env::var("MONGO_URL")
        .or_else(|_| std::env::var("MONGODB_URI"))
        .unwrap_or("mongodb://127.0.0.1:27017".to_string());

    let client = Client::with_uri_str(&mongo_uri).await.unwrap();
    let db = client.database("gettic");
    println!("✅ MongoDB bağlandı");

    let port = std::env::var("PORT").unwrap_or("3000".to_string());
    let addr = format!("0.0.0.0:{}", port);

    println!("🚀 Gettic Rust Backend başlatıldı :{}", port);

    let app_state = web::Data::new(AppState {
        db,
        ws_clients: Mutex::new(HashMap::new()),
    });

    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            // Auth
            .route("/api/register", web::post().to(register))
            .route("/api/login", web::post().to(login))
            // Servers
            .route("/api/servers", web::get().to(get_servers))
            .route("/api/servers", web::post().to(create_server))
            .route("/api/servers/{id}/channels", web::get().to(get_channels))
            .route("/api/servers/{id}/channels", web::post().to(create_channel))
            // Messages
            .route("/api/channels/{id}/messages", web::get().to(get_messages))
            .route("/api/channels/{id}/messages", web::post().to(send_message))
            // Webhooks
            .route("/api/webhooks", web::get().to(get_webhooks))
            .route("/api/webhooks", web::post().to(create_webhook))
            .route("/api/webhook/{token}", web::post().to(webhook_send))
            // Bots
            .route("/api/bots", web::get().to(get_bots))
            .route("/api/bots", web::post().to(create_bot))
            // Health
            .route("/health", web::get().to(health))
    })
    .bind(&addr)?
    .run()
    .await
  }
