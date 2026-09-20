<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use App\Controllers\AuthController;
use App\Controllers\BranchScopedCrudController;
use App\Controllers\CrudController;
use App\Controllers\ItemController;
use App\Helpers\Response;
use App\Helpers\Router;
use App\Middleware\CorsMiddleware;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;

CorsMiddleware::handle();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// Strip a /pos-system/backend/public prefix if the app is served from a
// sub-path under XAMPP's htdocs rather than its own vhost root.
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
    $uri = substr($uri, strlen($scriptDir)) ?: '/';
}

$pdo = get_pdo();
$router = new Router();

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
$router->post('/api/auth/login', fn () => (new AuthController())->login());
$router->get('/api/auth/me', fn () => (new AuthController())->me());

// Phase-1 self-check endpoint only.
$router->get('/api/staff/accounts', function () {
    $claims = JwtAuthMiddleware::authenticate();
    PermissionMiddleware::require($claims, 'staff.manage_accounts');
    Response::json(['message' => 'You have staff.manage_accounts — this would list staff accounts.']);
});

// ---------------------------------------------------------------
// Catalog — global lookup tables (section 4.3)
// ---------------------------------------------------------------
$categories = new CrudController($pdo, 'categories', ['name', 'parent_id'], 'catalog.manage_items');
$router->get('/api/categories', fn () => $categories->index());
$router->post('/api/categories', fn () => $categories->store());
$router->put('/api/categories/{id}', fn ($id) => $categories->update($id));
$router->delete('/api/categories/{id}', fn ($id) => $categories->destroy($id));

$brands = new CrudController($pdo, 'brands', ['name', 'code'], 'catalog.manage_items', 'BRD');
$router->get('/api/brands', fn () => $brands->index());
$router->post('/api/brands', fn () => $brands->store());
$router->put('/api/brands/{id}', fn ($id) => $brands->update($id));
$router->delete('/api/brands/{id}', fn ($id) => $brands->destroy($id));

$productLines = new CrudController($pdo, 'product_lines', ['branch_id', 'name', 'code'], 'catalog.manage_items', 'PRD');
$router->get('/api/product-lines', fn () => $productLines->index());
$router->post('/api/product-lines', fn () => $productLines->store());
$router->put('/api/product-lines/{id}', fn ($id) => $productLines->update($id));
$router->delete('/api/product-lines/{id}', fn ($id) => $productLines->destroy($id));

$taxCodes = new CrudController(
    $pdo, 'tax_codes',
    ['code', 'name', 'gst_percent', 'cgst_percent', 'sgst_percent', 'igst_percent', 'cess_percent'],
    'catalog.manage_items'
);
$router->get('/api/tax-codes', fn () => $taxCodes->index());
$router->post('/api/tax-codes', fn () => $taxCodes->store());
$router->put('/api/tax-codes/{id}', fn ($id) => $taxCodes->update($id));
$router->delete('/api/tax-codes/{id}', fn ($id) => $taxCodes->destroy($id));

$stockUnits = new CrudController($pdo, 'stock_units', ['name', 'short_code', 'is_decimal'], 'catalog.manage_items');
$router->get('/api/stock-units', fn () => $stockUnits->index());
$router->post('/api/stock-units', fn () => $stockUnits->store());
$router->put('/api/stock-units/{id}', fn ($id) => $stockUnits->update($id));
$router->delete('/api/stock-units/{id}', fn ($id) => $stockUnits->destroy($id));

// ---------------------------------------------------------------
// Items — dedicated controller (unit conversions + Excel import/export)
// ---------------------------------------------------------------
$itemController = new ItemController($pdo);
$router->get('/api/items/export', fn () => $itemController->exportExcel());
$router->get('/api/items/import/template', fn () => $itemController->importTemplate());
$router->post('/api/items/import/preview', fn () => $itemController->importPreview());
$router->post('/api/items/import/commit', fn () => $itemController->importCommit());
$router->get('/api/items', fn () => $itemController->index());
$router->post('/api/items', fn () => $itemController->store());
$router->get('/api/items/{id}', fn ($id) => $itemController->show($id));
$router->put('/api/items/{id}', fn ($id) => $itemController->update($id));
$router->delete('/api/items/{id}', fn ($id) => $itemController->destroy($id));

// ---------------------------------------------------------------
// Parties — branch-scoped (section 4.2)
// ---------------------------------------------------------------
$routes = new BranchScopedCrudController($pdo, 'routes', ['branch_id', 'name'], 'parties.manage_customers');
$router->get('/api/routes', fn () => $routes->index());
$router->post('/api/routes', fn () => $routes->store());
$router->put('/api/routes/{id}', fn ($id) => $routes->update($id));
$router->delete('/api/routes/{id}', fn ($id) => $routes->destroy($id));

// Cities hang off a route, not a branch directly — plain CrudController.
$cities = new CrudController($pdo, 'cities', ['route_id', 'name'], 'parties.manage_customers');
$router->get('/api/cities', fn () => $cities->index());
$router->post('/api/cities', fn () => $cities->store());
$router->put('/api/cities/{id}', fn ($id) => $cities->update($id));
$router->delete('/api/cities/{id}', fn ($id) => $cities->destroy($id));

$customers = new BranchScopedCrudController(
    $pdo, 'customers',
    ['branch_id', 'city_id', 'route_id', 'ledger_name', 'print_name', 'phone', 'gstin', 'address',
     'credit_limit', 'opening_balance', 'is_local_customer', 'status'],
    'parties.manage_customers'
);
$router->get('/api/customers', fn () => $customers->index());
$router->post('/api/customers', fn () => $customers->store());
$router->put('/api/customers/{id}', fn ($id) => $customers->update($id));
$router->delete('/api/customers/{id}', fn ($id) => $customers->destroy($id));

$suppliers = new BranchScopedCrudController(
    $pdo, 'suppliers',
    ['branch_id', 'name', 'phone', 'address', 'gstin', 'opening_balance', 'status'],
    'parties.manage_suppliers'
);
$router->get('/api/suppliers', fn () => $suppliers->index());
$router->post('/api/suppliers', fn () => $suppliers->store());
$router->put('/api/suppliers/{id}', fn ($id) => $suppliers->update($id));
$router->delete('/api/suppliers/{id}', fn ($id) => $suppliers->destroy($id));

try {
    $router->dispatch($method, $uri);
} catch (\Throwable $e) {
    $config = require __DIR__ . '/../config/config.php';
    Response::json([
        'error' => 'Server error',
        'detail' => $config['app']['debug'] ? $e->getMessage() : null,
    ], 500);
}
