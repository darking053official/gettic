<?php
// ==================== MONGODB BAĞLANTISI ====================
require_once __DIR__ . '/vendor/autoload.php'; // Composer MongoDB driver

$mongoUri = getenv('MONGODB_URI') ?: 'mongodb://localhost:27017';
$dbName = 'gettic';

try {
    $client = new MongoDB\Client($mongoUri);
    $db = $client->$dbName;
    $collection = $db->apiList;
} catch (Exception $e) {
    die("MongoDB bağlantı hatası: " . $e->getMessage());
}

// ==================== POST İŞLEMLERİ ====================
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Kaydetme
    if (isset($_POST['save'])) {
        $bulkOps = [];
        for ($i = 1; $i <= 100; $i++) {
            $key = $_POST["k$i"] ?? '';
            $val = $_POST["v$i"] ?? '';
            if (!empty($key)) {
                $bulkOps[] = [
                    'updateOne' => [
                        ['key' => $key],
                        ['$set' => [
                            'value' => !empty($val) ? $val : null,
                            'updatedAt' => new MongoDB\BSON\UTCDateTime()
                        ]],
                        ['upsert' => true]
                    ]
                ];
            }
        }
        
        if (!empty($bulkOps)) {
            $collection->bulkWrite($bulkOps);
            $message = "✅ Kaydedildi!";
            $messageType = "success";
        }
    }
    
    // Sıfırlama
    if (isset($_POST['reset'])) {
        $collection->deleteMany([]);
        
        $categories = ['auth', 'user', 'message', 'channel', 'system'];
        $defaults = [];
        foreach ($categories as $cat) {
            for ($i = 1; $i <= 20; $i++) {
                $defaults[] = [
                    'key' => "$cat$i",
                    'value' => null,
                    'updatedAt' => new MongoDB\BSON\UTCDateTime()
                ];
            }
        }
        
        $collection->insertMany($defaults);
        $message = "🔄 Sıfırlandı! Tüm değerler null.";
        $messageType = "success";
    }
}

// ==================== VERİYİ ÇEK ====================
$items = $collection->find([], ['sort' => ['key' => 1]])->toArray();

// Eğer boşsa varsayılan doldur
if (empty($items)) {
    $categories = ['auth', 'user', 'message', 'channel', 'system'];
    $defaults = [];
    foreach ($categories as $cat) {
        for ($i = 1; $i <= 20; $i++) {
            $defaults[] = [
                'key' => "$cat$i",
                'value' => null,
                'updatedAt' => new MongoDB\BSON\UTCDateTime()
            ];
        }
    }
    $collection->insertMany($defaults);
    $items = $collection->find([], ['sort' => ['key' => 1]])->toArray();
}

$total = count($items);
$setCount = 0;
foreach ($items as $item) {
    if ($item->value !== null) $setCount++;
}
?>

<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gettic API Listesi - PHP Panel</title>
    <style>
        :root {
            --bg: #0a0a14;
            --bg2: #111122;
            --bg3: #181830;
            --b: rgba(255, 255, 255, .05);
            --b2: rgba(255, 255, 255, .08);
            --ac: #b57bee;
            --t1: #e8e8f8;
            --t2: #9898b8;
            --t3: #585878;
            --gr: #22c55e;
            --re: #ef4444;
            --ye: #f59e0b;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: var(--bg);
            color: var(--t1);
            font-family: 'Segoe UI', sans-serif;
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h2 {
            text-align: center;
            color: #c99df2;
            margin-bottom: 5px;
            font-size: 20px;
        }
        .info {
            text-align: center;
            color: var(--t3);
            font-size: 12px;
            margin-bottom: 20px;
        }
        .msg {
            text-align: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
        }
        .msg.success { background: rgba(34, 197, 94, .1); color: var(--gr); }
        .msg.error { background: rgba(239, 68, 68, .1); color: var(--re); }
        .toolbar {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        button, .btn {
            padding: 10px 22px;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            transition: all .15s;
            font-family: inherit;
        }
        .btn-save { background: var(--ac); color: #fff; }
        .btn-save:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-reset { background: var(--re); color: #fff; }
        .btn-json { background: #6366f1; color: #fff; }
        .btn-json:hover { filter: brightness(1.1); }
        input[type="text"].search {
            padding: 8px 14px;
            background: var(--bg2);
            border: 1px solid var(--b2);
            border-radius: 7px;
            color: var(--t1);
            font-size: 12px;
            outline: none;
            width: 200px;
        }
        input[type="text"].search:focus { border-color: var(--ac); }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        td {
            padding: 4px 8px;
            border-bottom: 1px solid var(--b);
            font-size: 12px;
        }
        td:first-child {
            width: 30px;
            text-align: center;
            color: var(--t3);
            font-size: 10px;
        }
        td:nth-child(2) {
            font-family: 'JetBrains Mono', monospace;
            color: var(--t2);
            width: 120px;
            font-size: 11px;
        }
        td:nth-child(3) {
            width: 50px;
            text-align: center;
            font-size: 10px;
        }
        td:nth-child(3) .set { color: var(--gr); }
        td:nth-child(3) .null { color: var(--t3); }
        input[type="text"].val {
            width: 100%;
            padding: 6px 10px;
            background: var(--bg2);
            border: 1px solid var(--b2);
            border-radius: 5px;
            color: var(--t1);
            font-size: 11px;
            outline: none;
            font-family: inherit;
        }
        input[type="text"].val:focus { border-color: var(--ac); }
        input[type="text"].val.dirty { border-color: var(--ye); }
        .stats {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-bottom: 20px;
        }
        .stat {
            background: var(--bg2);
            padding: 10px 16px;
            border-radius: 8px;
            text-align: center;
            min-width: 80px;
        }
        .stat .num { font-size: 20px; font-weight: 800; color: var(--ac); }
        .stat .lbl { font-size: 9px; color: var(--t3); text-transform: uppercase; }
        @media (max-width: 600px) {
            table { font-size: 10px; }
            td:nth-child(2) { width: 80px; font-size: 9px; }
            input[type="text"].val { font-size: 10px; padding: 4px 6px; }
            .toolbar { flex-direction: column; align-items: center; }
        }
    </style>
</head>
<body>

<div class="container">
    <h2>⚡ gettic.js.org/apis/list.php</h2>
    <div class="info">
        <?= $total ?> endpoint · <?= $setCount ?> dolu · <?= $total - $setCount ?> null · MongoDB
    </div>

    <?php if (!empty($message)): ?>
        <div class="msg <?= $messageType ?>"><?= $message ?></div>
    <?php endif; ?>

    <div class="stats">
        <div class="stat"><div class="num"><?= $total ?></div><div class="lbl">Toplam</div></div>
        <div class="stat"><div class="num" style="color:var(--gr)"><?= $setCount ?></div><div class="lbl">Dolu</div></div>
        <div class="stat"><div class="num" style="color:var(--t3)"><?= $total - $setCount ?></div><div class="lbl">Null</div></div>
        <div class="stat"><div class="num" style="color:var(--ye)" id="modCount">0</div><div class="lbl">Değişti</div></div>
    </div>

    <form method="post" id="f">
        <div class="toolbar">
            <button type="submit" name="save" class="btn-save">💾 MongoDB'ye Kaydet</button>
            <button type="submit" name="reset" class="btn-reset" onclick="return confirm('Tüm değerler null olacak. Emin misin?')">🔄 Sıfırla</button>
            <button type="button" class="btn-json" onclick="viewJSON()">📋 JSON Gör</button>
            <input type="text" class="search" placeholder="Ara..." onkeyup="filter()" id="search">
        </div>

        <table id="tbl">
            <?php $idx = 1; foreach ($items as $item): 
                $val = $item->value ?? '';
            ?>
            <tr data-key="<?= htmlspecialchars($item->key) ?>">
                <td><?= $idx ?></td>
                <td><?= htmlspecialchars($item->key) ?></td>
                <td><span class="<?= $val ? 'set' : 'null' ?>"><?= $val ? '✔' : 'null' ?></span></td>
                <td>
                    <input type="text" name="v<?= $idx ?>" value="<?= htmlspecialchars($val) ?>" placeholder="null" class="val" data-orig="<?= htmlspecialchars($val) ?>" oninput="this.classList.toggle('dirty',this.value!==this.dataset.orig);countMod()">
                    <input type="hidden" name="k<?= $idx ?>" value="<?= htmlspecialchars($item->key) ?>">
                </td>
            </tr>
            <?php $idx++; endforeach; ?>
        </table>
    </form>
</div>

<script>
function filter() {
    var q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('#tbl tr').forEach(function(r) {
        var key = r.getAttribute('data-key');
        if (!key) return;
        r.style.display = (key.includes(q) || q === '') ? '' : 'none';
    });
}

function countMod() {
    var c = document.querySelectorAll('.val.dirty').length;
    document.getElementById('modCount').textContent = c;
}

function viewJSON() {
    var data = {};
    document.querySelectorAll('#tbl tr').forEach(function(r) {
        var key = r.getAttribute('data-key');
        if (!key) return;
        var inp = r.querySelector('input.val');
        data[key] = inp.value || null;
    });
    var win = window.open('', '_blank', 'width=600,height=400');
    win.document.write('<pre style="background:#0a0a14;color:#e8e8f8;padding:20px;font-family:monospace;font-size:12px;">' + JSON.stringify({status:'ok',total:Object.keys(data).length,data:data}, null, 2) + '</pre>');
}
</script>

</body>
</html>
