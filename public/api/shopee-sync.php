<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$partner_id = 2036279;
$partner_key = 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
$host = 'https://partner.shopeemobile.com';

// Shop ID & Access Token
$shop_id = isset($_GET['shop_id']) ? intval($_GET['shop_id']) : 1030191310;
$access_token = isset($_GET['access_token']) && !empty($_GET['access_token']) 
    ? trim($_GET['access_token']) 
    : 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY';

function callShopeeApi($path, $partner_id, $partner_key, $timestamp, $access_token, $shop_id, $queryParams = []) {
    global $host;
    $baseString = sprintf('%s%s%s%s%s', $partner_id, $path, $timestamp, $access_token, $shop_id);
    $sign = hash_hmac('sha256', $baseString, $partner_key);

    $params = array_merge([
        'partner_id' => $partner_id,
        'timestamp' => $timestamp,
        'access_token' => $access_token,
        'shop_id' => $shop_id,
        'sign' => $sign
    ], $queryParams);

    $url = $host . $path . '?' . http_build_query($params);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['error' => $err];
    }
    return json_decode($response, true);
}

$timestamp = time();

// 1. Get Item List
$listRes = callShopeeApi('/api/v2/product/get_item_list', $partner_id, $partner_key, $timestamp, $access_token, $shop_id, [
    'offset' => 0,
    'page_size' => 20,
    'item_status' => 'NORMAL'
]);

if (!$listRes || (isset($listRes['error']) && !empty($listRes['error']))) {
    echo json_encode([
        'status' => 'error',
        'message' => $listRes['message'] ?? ($listRes['error'] ?? 'Gagal menghubungi Shopee Open API'),
        'raw' => $listRes
    ]);
    exit;
}

$items = $listRes['response']['item'] ?? [];
if (empty($items)) {
    echo json_encode([
        'status' => 'success',
        'count' => 0,
        'data' => []
    ]);
    exit;
}

$item_ids = array_map(function($i) { return $i['item_id']; }, $items);
$item_id_str = implode(',', array_slice($item_ids, 0, 20));

// 2. Get Item Base Info
$baseRes = callShopeeApi('/api/v2/product/get_item_base_info', $partner_id, $partner_key, time(), $access_token, $shop_id, [
    'item_id_list' => $item_id_str
]);

$itemList = $baseRes['response']['item_list'] ?? [];

$results = [];
foreach ($itemList as $p) {
    $price = 0;
    if (isset($p['price_info'][0]['current_price'])) {
        $price = $p['price_info'][0]['current_price'];
    } elseif (isset($p['price_info'][0]['original_price'])) {
        $price = $p['price_info'][0]['original_price'];
    }

    $stock = 0;
    if (isset($p['stock_info_v2']['summary_info']['total_available_stock'])) {
        $stock = $p['stock_info_v2']['summary_info']['total_available_stock'];
    }

    $results[] = [
        'id' => 'shopee_' . $p['item_id'],
        'item_id' => strval($p['item_id']),
        'company_code' => 'RSG',
        'channel' => 'shopee',
        'channelName' => 'Shopee Marketplace',
        'shopName' => 'Koperasi Sahabat Anak Bangsa',
        'nama_produk' => $p['item_name'] ?? 'Produk Shopee',
        'sku_marketplace' => $p['item_sku'] ?: ('SHOPEE-' . $p['item_id']),
        'harga_jual' => $price,
        'stok_marketplace' => $stock,
        'varian_marketplace' => 'Varian Asli Shopee',
        'status' => 'Belum Dimapping',
        'syncedAt' => date('d M Y, H:i')
    ];
}

echo json_encode([
    'status' => 'success',
    'count' => count($results),
    'data' => $results
]);
