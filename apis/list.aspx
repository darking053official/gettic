<%@ Page Language="C#" AutoEventWireup="true" %>
<%@ Import Namespace="System.Net.Http" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Gettic API Listesi - MongoDB</title>
    <style>
        body{background:#0a0a14;color:#e8e8f8;font-family:Segoe UI,sans-serif;padding:20px;margin:0}
        h2{color:#c99df2;text-align:center;margin-bottom:5px}
        .info{text-align:center;color:#585878;font-size:11px;margin-bottom:20px}
        table{width:100%;max-width:800px;margin:0 auto;border-collapse:collapse}
        td{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.04)}
        td:first-child{width:28px;color:#585878;font-size:10px;text-align:center}
        td:nth-child(2){font-family:JetBrains Mono,monospace;font-size:11px;color:#9898b8;width:110px}
        td:nth-child(3){width:45px;text-align:center;font-size:9px}
        .set{color:#22c55e}.null{color:#585878}
        input{width:100%;padding:5px 8px;background:#111122;border:1px solid rgba(255,255,255,.06);border-radius:5px;color:#e8e8f8;font-size:11px;outline:none}
        input:focus{border-color:#b57bee}
        input.dirty{border-color:#f59e0b}
        button{padding:8px 20px;background:#b57bee;border:none;border-radius:7px;color:#fff;font-weight:700;cursor:pointer;font-size:12px;margin:10px 4px}
        button:hover{filter:brightness(1.1)}
        button.reset{background:#ef4444}
        .toolbar{text-align:center;margin-bottom:15px}
        .msg{text-align:center;color:#22c55e;font-weight:700;margin:8px 0;font-size:13px}
        .msg.err{color:#ef4444}
        #search{width:180px;margin-left:15px;display:inline-block;padding:6px 10px;background:#111122;border:1px solid rgba(255,255,255,.06);border-radius:5px;color:#e8e8f8;font-size:11px;outline:none}
        #search:focus{border-color:#b57bee}
        .loading{text-align:center;padding:40px;color:#585878}
    </style>
</head>
<body>

<%
    // Backend API URL'si
    string apiBase = "https://gettic-j49l.onrender.com/api";
    
    var data = new Dictionary<string, object>();
    bool loaded = false;
    string errorMsg = "";
    
    // POST: Kaydet
    if(Request.HttpMethod == "POST" && Request.Form["save"] == "1") {
        try {
            var bulkData = new Dictionary<string, object>();
            for(int i=1; i<=100; i++) {
                string key = Request.Form["k"+i];
                string val = Request.Form["v"+i];
                if(!string.IsNullOrEmpty(key)) {
                    bulkData[key] = string.IsNullOrEmpty(val) ? null : (object)val;
                }
            }
            
            using(var client = new HttpClient()) {
                var json = new JavaScriptSerializer().Serialize(new { data = bulkData });
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = client.PostAsync(apiBase + "/list/bulk", content).Result;
                
                if(response.IsSuccessStatusCode) {
                    Response.Write("<script>document.getElementById('msg').textContent='✅ MongoDB''ye kaydedildi!';</script>");
                } else {
                    Response.Write("<script>document.getElementById('msg').className='msg err';document.getElementById('msg').textContent='❌ Kaydetme hatası!';</script>");
                }
            }
        } catch(Exception ex) {
            errorMsg = ex.Message;
        }
    }
    
    // POST: Reset
    if(Request.HttpMethod == "POST" && Request.Form["reset"] == "1") {
        try {
            using(var client = new HttpClient()) {
                var response = client.PostAsync(apiBase + "/list/reset", null).Result;
                if(response.IsSuccessStatusCode) {
                    Response.Write("<script>document.getElementById('msg').textContent='🔄 Sıfırlandı! Tüm değerler null.';</script>");
                }
            }
        } catch(Exception ex) {
            errorMsg = ex.Message;
        }
    }
    
    // Veriyi MongoDB'den çek
    try {
        using(var client = new HttpClient()) {
            var response = client.GetAsync(apiBase + "/list").Result;
            if(response.IsSuccessStatusCode) {
                var json = response.Content.ReadAsStringAsync().Result;
                var result = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
                if(result.ContainsKey("data") && result["data"] is Dictionary<string, object>) {
                    data = (Dictionary<string, object>)result["data"];
                    loaded = true;
                }
            } else {
                errorMsg = "API'ye bağlanamadı: " + response.StatusCode;
            }
        }
    } catch(Exception ex) {
        errorMsg = "Bağlantı hatası: " + ex.Message;
    }
    
    // Yedek: Eğer API çalışmazsa varsayılan göster
    if(!loaded && data.Count == 0) {
        string[] cats = {"auth","user","message","channel","system"};
        foreach(string c in cats) for(int j=1; j<=20; j++) data[c+"_"+j] = null;
    }
    
    int total = data.Count;
    int setCount = 0;
    foreach(var kvp in data) if(kvp.Value != null) setCount++;
%>

<h2>⚡ gettic.js.org/apis/list.aspx</h2>
<div class="info">
    <%= total %> endpoint · <%= setCount %> dolu · <%= total - setCount %> null · 
    <span style="color:<%= loaded?"#22c55e":"#ef4444" %>">●</span> 
    MongoDB: <%= loaded ? "Bağlı" : (string.IsNullOrEmpty(errorMsg) ? "Yedek mod" : "Hata") %>
</div>

<% if(!string.IsNullOrEmpty(errorMsg)) { %>
<div class="msg err">⚠ <%= errorMsg %></div>
<% } %>

<div class="toolbar">
    <form method="post" id="f">
        <input type="hidden" name="save" id="s" value="0">
        <input type="hidden" name="reset" id="r" value="0">
        <button type="button" onclick="save()">💾 MongoDB'ye Kaydet</button>
        <button type="button" class="reset" onclick="resetAll()">🔄 Sıfırla</button>
        <input type="text" id="search" placeholder="Ara..." onkeyup="filter()">
    </form>
</div>

<div class="msg" id="msg"></div>

<table id="tbl">
<%
    int idx = 1;
    foreach(var kvp in data) {
        string val = kvp.Value != null ? kvp.Value.ToString() : "";
%>
<tr data-key="<%= kvp.Key %>">
    <td><%= idx %></td>
    <td><%= kvp.Key %></td>
    <td><span class="<%= kvp.Value == null ? "null" : "set" %>"><%= kvp.Value == null ? "null" : "✔" %></span></td>
    <td><input type="text" name="v<%= idx %>" value="<%= Server.HtmlEncode(val) %>" placeholder="null" data-orig="<%= Server.HtmlEncode(val) %>" oninput="this.classList.toggle('dirty',this.value!==this.dataset.orig)"></td>
    <input type="hidden" name="k<%= idx %>" value="<%= kvp.Key %>">
</tr>
<%
        idx++;
    }
%>
</table>

<script>
function save(){document.getElementById('s').value='1';document.getElementById('f').submit();}
function resetAll(){if(confirm('Tüm değerler null olacak. Emin misin?')){document.getElementById('r').value='1';document.getElementById('f').submit();}}
function filter(){
    var q=document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('#tbl tr').forEach(function(r){
        var key=r.getAttribute('data-key');
        if(!key)return;
        r.style.display=(key.includes(q)||q=='')?'':'none';
    });
}
</script>

</body>
</html>
