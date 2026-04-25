// server.go - Gettic Go Backend
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// ============ MODELS ============
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Username  string             `bson:"username" json:"username"`
	Password  string             `bson:"password" json:"-"`
	Avatar    string             `bson:"avatar" json:"avatar"`
	Status    string             `bson:"status" json:"status"`
	Bio       string             `bson:"bio" json:"bio"`
	Badges    []string           `bson:"badges" json:"badges"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Message struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Content   string             `bson:"content" json:"content"`
	Sender    primitive.ObjectID `bson:"sender" json:"sender"`
	SenderName string            `bson:"senderName" json:"senderName"`
	Room      string             `bson:"room" json:"room"`
	Type      string             `bson:"type" json:"type"`
	Edited    bool               `bson:"edited" json:"edited"`
	IsBot     bool               `bson:"isBot" json:"isBot"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Server struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name       string             `bson:"name" json:"name"`
	Owner      primitive.ObjectID `bson:"owner" json:"owner"`
	Icon       string             `bson:"icon" json:"icon"`
	InviteCode string             `bson:"inviteCode" json:"inviteCode"`
	Members    []primitive.ObjectID `bson:"members" json:"members"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

type Channel struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Server    primitive.ObjectID `bson:"server" json:"server"`
	Type      string             `bson:"type" json:"type"`
	Topic     string             `bson:"topic" json:"topic"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Webhook struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Server    primitive.ObjectID `bson:"server" json:"server"`
	Channel   primitive.ObjectID `bson:"channel" json:"channel"`
	Token     string             `bson:"token" json:"token"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Bot struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name        string             `bson:"name" json:"name"`
	Owner       primitive.ObjectID `bson:"owner" json:"owner"`
	Prefix      string             `bson:"prefix" json:"prefix"`
	Description string             `bson:"description" json:"description"`
	Token       string             `bson:"token" json:"token"`
	IsOnline    bool               `bson:"isOnline" json:"isOnline"`
	Commands    []BotCommand       `bson:"commands" json:"commands"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type BotCommand struct {
	Name     string `bson:"name" json:"name"`
	Response string `bson:"response" json:"response"`
}

// ============ GLOBALS ============
var (
	client     *mongo.Client
	db         *mongo.Database
	upgrader   = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	clients    = make(map[*websocket.Conn]string)
	clientsMu  sync.RWMutex
)

// ============ HELPERS ============
func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func errorResponse(w http.ResponseWriter, status int, msg string) {
	jsonResponse(w, status, map[string]string{"error": msg})
}

// ============ AUTH ============
func registerHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, 400, "Geçersiz veri")
		return
	}
	if len(body.Username) < 3 || len(body.Password) < 6 {
		errorResponse(w, 400, "Kullanıcı adı en az 3, şifre en az 6 karakter")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	user := User{
		Username:  body.Username,
		Password:  string(hash),
		Status:    "online",
		Badges:    []string{"Üye"},
		CreatedAt: time.Now(),
	}

	result, err := db.Collection("users").InsertOne(r.Context(), user)
	if err != nil {
		errorResponse(w, 400, "Bu kullanıcı adı alınmış")
		return
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	user.Password = ""
	jsonResponse(w, 201, map[string]interface{}{
		"user":  user,
		"token": generateToken(),
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, 400, "Geçersiz veri")
		return
	}

	var user User
	err := db.Collection("users").FindOne(r.Context(), bson.M{"username": body.Username}).Decode(&user)
	if err != nil {
		errorResponse(w, 400, "Kullanıcı bulunamadı")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.Password)) != nil {
		errorResponse(w, 400, "Şifre hatalı")
		return
	}

	user.Password = ""
	jsonResponse(w, 200, map[string]interface{}{
		"user":  user,
		"token": generateToken(),
	})
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, 200, map[string]string{"status": "ok"})
}

// ============ SERVERS ============
func getServersHandler(w http.ResponseWriter, r *http.Request) {
	cursor, _ := db.Collection("servers").Find(r.Context(), bson.M{})
	var servers []Server
	cursor.All(r.Context(), &servers)
	if servers == nil {
		servers = []Server{}
	}
	jsonResponse(w, 200, servers)
}

func createServerHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Template string `json:"template"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" {
		errorResponse(w, 400, "Sunucu adı gerekli")
		return
	}

	server := Server{
		Name:       body.Name,
		InviteCode: generateToken()[:8],
		Members:    []primitive.ObjectID{},
		CreatedAt:  time.Now(),
	}

	result, _ := db.Collection("servers").InsertOne(r.Context(), server)
	server.ID = result.InsertedID.(primitive.ObjectID)

	// Default channels
	defaultChannels := []string{"genel", "sesli"}
	for _, ch := range defaultChannels {
		channel := Channel{
			Name:      ch,
			Server:    server.ID,
			Type:      func() string { if ch == "sesli" { return "voice" }; return "text" }(),
			CreatedAt: time.Now(),
		}
		db.Collection("channels").InsertOne(r.Context(), channel)
	}

	jsonResponse(w, 201, server)
}

// ============ CHANNELS ============
func getChannelsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serverID, _ := primitive.ObjectIDFromHex(vars["id"])
	cursor, _ := db.Collection("channels").Find(r.Context(), bson.M{"server": serverID})
	var channels []Channel
	cursor.All(r.Context(), &channels)
	if channels == nil {
		channels = []Channel{}
	}
	jsonResponse(w, 200, channels)
}

func createChannelHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serverID, _ := primitive.ObjectIDFromHex(vars["id"])
	var body struct {
		Name  string `json:"name"`
		Type  string `json:"type"`
		Topic string `json:"topic"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	channel := Channel{
		Name:      body.Name,
		Server:    serverID,
		Type:      body.Type,
		Topic:     body.Topic,
		CreatedAt: time.Now(),
	}
	result, _ := db.Collection("channels").InsertOne(r.Context(), channel)
	channel.ID = result.InsertedID.(primitive.ObjectID)
	jsonResponse(w, 201, channel)
}

// ============ MESSAGES ============
func getMessagesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	channelID := vars["id"]
	cursor, _ := db.Collection("messages").Find(r.Context(), bson.M{"channel": channelID})
	var messages []Message
	cursor.All(r.Context(), &messages)
	if messages == nil {
		messages = []Message{}
	}
	jsonResponse(w, 200, messages)
}

func sendMessageHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	channelID := vars["id"]
	var body struct {
		Content string `json:"content"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	msg := Message{
		Content:    body.Content,
		SenderName: "Kullanıcı",
		Room:       channelID,
		Type:       "text",
		CreatedAt:  time.Now(),
	}
	result, _ := db.Collection("messages").InsertOne(r.Context(), msg)
	msg.ID = result.InsertedID.(primitive.ObjectID)

	// Broadcast to WebSocket clients
	clientsMu.RLock()
	for conn := range clients {
		conn.WriteJSON(msg)
	}
	clientsMu.RUnlock()

	jsonResponse(w, 201, msg)
}

// ============ WEBHOOKS ============
func getWebhooksHandler(w http.ResponseWriter, r *http.Request) {
	cursor, _ := db.Collection("webhooks").Find(r.Context(), bson.M{})
	var webhooks []Webhook
	cursor.All(r.Context(), &webhooks)
	if webhooks == nil {
		webhooks = []Webhook{}
	}
	jsonResponse(w, 200, webhooks)
}

func createWebhookHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name      string `json:"name"`
		ServerID  string `json:"serverId"`
		ChannelID string `json:"channelId"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	serverID, _ := primitive.ObjectIDFromHex(body.ServerID)
	channelID, _ := primitive.ObjectIDFromHex(body.ChannelID)
	token := generateToken()

	webhook := Webhook{
		Name:      body.Name,
		Server:    serverID,
		Channel:   channelID,
		Token:     token,
		CreatedAt: time.Now(),
	}
	result, _ := db.Collection("webhooks").InsertOne(r.Context(), webhook)
	webhook.ID = result.InsertedID.(primitive.ObjectID)
	jsonResponse(w, 201, webhook)
}

func webhookSendHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	token := vars["token"]

	var webhook Webhook
	err := db.Collection("webhooks").FindOne(r.Context(), bson.M{"token": token}).Decode(&webhook)
	if err != nil {
		errorResponse(w, 404, "Webhook bulunamadı")
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	msg := Message{
		Content:    body.Content,
		SenderName: webhook.Name,
		Room:       webhook.Channel.Hex(),
		Type:       "text",
		IsBot:      true,
		CreatedAt:  time.Now(),
	}
	result, _ := db.Collection("messages").InsertOne(r.Context(), msg)
	msg.ID = result.InsertedID.(primitive.ObjectID)

	clientsMu.RLock()
	for conn := range clients {
		conn.WriteJSON(msg)
	}
	clientsMu.RUnlock()

	jsonResponse(w, 200, msg)
}

// ============ BOTS ============
func getBotsHandler(w http.ResponseWriter, r *http.Request) {
	cursor, _ := db.Collection("bots").Find(r.Context(), bson.M{})
	var bots []Bot
	cursor.All(r.Context(), &bots)
	if bots == nil {
		bots = []Bot{}
	}
	jsonResponse(w, 200, bots)
}

func createBotHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name   string `json:"name"`
		Prefix string `json:"prefix"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	bot := Bot{
		Name:      body.Name,
		Prefix:    body.Prefix,
		Token:     generateToken(),
		IsOnline:  false,
		CreatedAt: time.Now(),
		Commands: []BotCommand{
			{Name: "ping", Response: "Pong!"},
			{Name: "yardim", Response: "/ping, /sa, /temizle"},
		},
	}
	result, _ := db.Collection("bots").InsertOne(r.Context(), bot)
	bot.ID = result.InsertedID.(primitive.ObjectID)
	jsonResponse(w, 201, bot)
}

// ============ WEBSOCKET ============
func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	clientsMu.Lock()
	clients[conn] = "anon"
	clientsMu.Unlock()

	defer func() {
		clientsMu.Lock()
		delete(clients, conn)
		clientsMu.Unlock()
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var data map[string]interface{}
		json.Unmarshal(msg, &data)

		// Echo back to all clients
		clientsMu.RLock()
		for c := range clients {
			c.WriteJSON(data)
		}
		clientsMu.RUnlock()
	}
}

// ============ MAIN ============
func main() {
	// MongoDB connection
	mongoURI := os.Getenv("MONGO_URL")
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGODB_URI")
	}
	if mongoURI == "" {
		mongoURI = "mongodb://127.0.0.1:27017"
	}

	var err error
	client, err = mongo.Connect(nil, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("MongoDB bağlantı hatası:", err)
	}
	db = client.Database("gettic")
	fmt.Println("✅ MongoDB bağlandı")

	// Router
	r := mux.NewRouter()

	// Static
	r.PathPrefix("/").Handler(http.FileServer(http.Dir(".")))

	// Auth
	r.HandleFunc("/api/register", registerHandler).Methods("POST")
	r.HandleFunc("/api/login", loginHandler).Methods("POST")
	r.HandleFunc("/api/me", meHandler).Methods("GET")

	// Servers
	r.HandleFunc("/api/servers", getServersHandler).Methods("GET")
	r.HandleFunc("/api/servers", createServerHandler).Methods("POST")
	r.HandleFunc("/api/servers/{id}/channels", getChannelsHandler).Methods("GET")
	r.HandleFunc("/api/servers/{id}/channels", createChannelHandler).Methods("POST")

	// Messages
	r.HandleFunc("/api/channels/{id}/messages", getMessagesHandler).Methods("GET")
	r.HandleFunc("/api/channels/{id}/messages", sendMessageHandler).Methods("POST")

	// Webhooks
	r.HandleFunc("/api/webhooks", getWebhooksHandler).Methods("GET")
	r.HandleFunc("/api/webhooks", createWebhookHandler).Methods("POST")
	r.HandleFunc("/api/webhook/{token}", webhookSendHandler).Methods("POST")

	// Bots
	r.HandleFunc("/api/bots", getBotsHandler).Methods("GET")
	r.HandleFunc("/api/bots", createBotHandler).Methods("POST")

	// WebSocket
	r.HandleFunc("/ws", wsHandler)

	// Health
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, 200, map[string]string{"status": "ok"})
	})

	// Start
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	fmt.Println("🚀 Gettic Go Backend başlatıldı :" + port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
