<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use App\Controllers\AuditLogController;
use App\Controllers\AuthController;
use App\Controllers\BillController;
use App\Controllers\DashboardController;
use App\Controllers\HeldBillController;
use App\Controllers\ItemController;
use App\Controllers\PartyController;
use App\Controllers\PaymentController;
use App\Controllers\PaymentMethodController;
use App\Controllers\PurchaseController;
use App\Controllers\ReportController;
use App\Controllers\SettingsController;
use App\Controllers\UserController;
use App\Helpers\Router;
use App\Middleware\CorsMiddleware;

CorsMiddleware::handle();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// Strip a /pos/veg-pos/backend/public prefix if served from a sub-path
// under XAMPP's htdocs rather than its own vhost root.
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
    $uri = substr($uri, strlen($scriptDir)) ?: '/';
}
if (!str_starts_with($uri, '/api') && $uri !== '/') {
    $uri = '/api' . (str_starts_with($uri, '/') ? $uri : '/' . $uri);
}

$pdo = get_pdo();
$router = new Router();

$auth = new AuthController($pdo);
$router->post('/api/auth/login', fn () => $auth->login());
$router->get('/api/auth/me', fn () => $auth->me());

$items = new ItemController($pdo);
$router->get('/api/items', fn () => $items->index());
$router->get('/api/items/{id}', fn ($id) => $items->show($id));
$router->post('/api/items', fn () => $items->store());
$router->put('/api/items/{id}', fn ($id) => $items->update($id));
$router->delete('/api/items/{id}', fn ($id) => $items->destroy($id));

$parties = new PartyController($pdo);
$router->get('/api/parties', fn () => $parties->index());
$router->get('/api/parties/{id}', fn ($id) => $parties->show($id));
$router->post('/api/parties', fn () => $parties->store());
$router->put('/api/parties/{id}', fn ($id) => $parties->update($id));
$router->delete('/api/parties/{id}', fn ($id) => $parties->destroy($id));
$router->get('/api/parties/{id}/ledger', fn ($id) => $parties->ledger($id));
$router->get('/api/parties/{id}/unpaid-documents', fn ($id) => $parties->unpaidDocuments($id));

$methods = new PaymentMethodController($pdo);
$router->get('/api/payment-methods', fn () => $methods->index());
$router->post('/api/payment-methods', fn () => $methods->store());
$router->put('/api/payment-methods/{id}', fn ($id) => $methods->update($id));

$bills = new BillController($pdo);
$router->get('/api/bills', fn () => $bills->index());
$router->get('/api/bills/{id}', fn ($id) => $bills->show($id));
$router->post('/api/bills', fn () => $bills->store());
$router->put('/api/bills/{id}', fn ($id) => $bills->update($id));
$router->delete('/api/bills/{id}', fn ($id) => $bills->destroy($id));
$router->get('/api/bills/{id}/print', fn ($id) => $bills->print($id));

$held = new HeldBillController($pdo);
$router->get('/api/held-bills', fn () => $held->index());
$router->post('/api/held-bills', fn () => $held->store());
$router->delete('/api/held-bills/{id}', fn ($id) => $held->destroy($id));

$payments = new PaymentController($pdo);
$router->get('/api/payments', fn () => $payments->index());
$router->get('/api/payments/{id}', fn ($id) => $payments->show($id));
$router->post('/api/payments', fn () => $payments->store());
$router->delete('/api/payments/{id}', fn ($id) => $payments->destroy($id));

$purchases = new PurchaseController($pdo);
$router->get('/api/purchases', fn () => $purchases->index());
$router->get('/api/purchases/{id}', fn ($id) => $purchases->show($id));
$router->post('/api/purchases', fn () => $purchases->store());
$router->put('/api/purchases/{id}', fn ($id) => $purchases->update($id));
$router->delete('/api/purchases/{id}', fn ($id) => $purchases->destroy($id));

$dashboard = new DashboardController($pdo);
$router->get('/api/dashboard/summary', fn () => $dashboard->summary());

$reports = new ReportController($pdo);
$router->get('/api/reports/daily-sales', fn () => $reports->dailySales());
$router->get('/api/reports/item-wise-sales', fn () => $reports->itemWiseSales());
$router->get('/api/reports/top-items', fn () => $reports->topItems());
$router->get('/api/reports/party-outstanding', fn () => $reports->partyOutstanding());
$router->get('/api/reports/commission', fn () => $reports->commissionReport());
$router->get('/api/reports/payment-collection', fn () => $reports->paymentCollection());
$router->get('/api/reports/purchases', fn () => $reports->purchaseReport());
$router->get('/api/reports/profit', fn () => $reports->profitSummary());
$router->get('/api/reports/bill-wise-profit', fn () => $reports->billWiseProfit());

$settings = new SettingsController($pdo);
$router->get('/api/settings', fn () => $settings->index());
$router->put('/api/settings', fn () => $settings->update());
$router->get('/api/settings/sequences', fn () => $settings->sequences());
$router->put('/api/settings/sequences/{id}', fn ($id) => $settings->updateSequence($id));

$users = new UserController($pdo);
$router->get('/api/users', fn () => $users->index());
$router->post('/api/users', fn () => $users->store());
$router->put('/api/users/{id}', fn ($id) => $users->update($id));

$audit = new AuditLogController($pdo);
$router->get('/api/audit-log', fn () => $audit->index());

$router->dispatch($method, $uri);
