# Garda — Flutter Migration Handoff

**Tujuan:** Rebuild Garda PWA (React) sebagai **Flutter native app** (Android + iOS)
sambil **REUSE** backend Supabase yang sudah battle-tested.

Dokumen ini adalah context lengkap untuk chat session Claude Code yang baru
di project Flutter. Baca sampai selesai sebelum mulai coding.

---

## 1. Ringkasan Garda

**Non-custodial PWA trading psychology guardrails untuk crypto futures.**

User connect API key exchange sendiri (Bybit, Binance, OKX, Bitget, KuCoin,
Gate.io). Garda enforce 12 aturan trading (leverage 1x, 1R/1% risk, cooldown,
lock, martingale block, dll) supaya user tidak trading emosional.

- **React PWA existing**: https://garda-alpha.vercel.app
- **GitHub React**: https://github.com/gardatradeid-hub/pwa.git
- **Supabase project**: `zwmfavbdlzrftwhuewuk` (region: ap-northeast-1 Tokyo)
- **Admin CMS**: `/admin/login` (email `admin@garda.app`, pw `Nn6YgReuSsXVqXH`)

---

## 2. Arsitektur — apa yang REUSE, apa yang REBUILD

### ✅ REUSE 100% (jangan sentuh)

- **Database schema** (8 tables): `profiles`, `trades`, `lock_events`,
  `daily_stats`, `equity_snapshots`, `app_config`, `admin_users`, `audit_logs`
- **7 Edge Functions** — semua business logic ada di sini:
  - `ccxt-proxy` — market data (ticker, ohlcv, balance, positions)
  - `execute-trade` — entry + SL + TP + 12 guardrails server-side
  - `close-trade` — close position + PnL + lock check
  - `sync-trade` — auto-detect SL/TP fired → close trade
  - `connect-exchange` — verify + encrypt API key
  - `admin-api` + `admin-auth` — CMS (tetap dipakai dari admin web,
    Flutter TIDAK perlu implement admin)
- **Shared modules**:
  - `_shared/crypto.ts` — AES-256-GCM encrypt/decrypt API keys
  - `_shared/exchange-client.ts` — hybrid CCXT + native REST untuk SL/TP
    per exchange (Bybit, Gate.io, Binance, OKX, Bitget, KuCoin)
  - `_shared/logger.ts` — audit logging
- **Env vars di Supabase**: sudah set, tidak perlu re-config
- **Admin CMS** — biarkan sebagai web React. Non-user-facing.

### 🔄 REBUILD di Flutter

- Semua di `src/` React — UI, state management, charts, i18n
- ~50 file `.tsx/.ts` client-side

**Point paling penting: 80% "business logic" ada di edge functions. Flutter
tinggal jadi client tipis yang call HTTP + render UI.**

---

## 3. Tech Stack Flutter (Recommended)

Setelah evaluasi trade-off untuk aplikasi trading profesional dengan
real-time chart, i18n, dan multi-exchange:

```yaml
name: garda_flutter
description: Garda — Trading Psychology Guardrails
publish_to: 'none'
version: 0.1.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'
  flutter: '>=3.24.0'

dependencies:
  flutter:
    sdk: flutter

  # State management — Riverpod 2 (halus dari Zustand background user)
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # HTTP + Supabase
  supabase_flutter: ^2.5.6         # auth + edge functions + realtime
  dio: ^5.4.3                       # untuk direct exchange calls (optional)

  # Charts — Syncfusion (professional grade, TradingView-like)
  # NOTE: butuh community license key kalau revenue >$1M (gratis untuk Garda)
  syncfusion_flutter_charts: ^26.2.4

  # Storage
  flutter_secure_storage: ^9.2.2   # JWT, biometric-gated
  hive: ^2.2.3                      # non-sensitive cache
  hive_flutter: ^1.1.0

  # Routing
  go_router: ^14.2.0                # deep linking, route guards

  # i18n (mirror ID+EN yang ada di React)
  easy_localization: ^3.0.7

  # Auth + security
  local_auth: ^2.3.0                # biometric untuk confirm trade
  google_sign_in: ^6.2.1            # OAuth

  # Notifications
  firebase_core: ^3.3.0
  firebase_messaging: ^15.1.0       # push untuk SL/TP alerts

  # Models (immutable + codegen)
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0

  # UI helpers
  google_fonts: ^6.2.1
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.10+1
  lottie: ^3.1.2                    # animasi splash / empty state

  # Utils
  intl: ^0.19.0                     # formatUSDT, formatPrice
  timeago: ^3.7.0                   # relative time (cooldown display)

dev_dependencies:
  flutter_test:
    sdk: flutter
  very_good_analysis: ^6.0.0        # lint preset (strict)
  build_runner: ^2.4.11
  riverpod_generator: ^2.4.3
  freezed: ^2.5.2
  json_serializable: ^6.8.0
  mocktail: ^1.0.4
  patrol: ^3.11.2                   # integration tests
```

### Kenapa Riverpod bukan BLoC

| | Riverpod | BLoC |
|---|---|---|
| Boilerplate | Minim | Banyak |
| Type safety | Compile-time | Runtime |
| Learning dari Zustand | Halus (paradigma serupa) | Steep |
| DevTools | Excellent | Bagus |
| Community 2026 | Growing 🔝 | Stable |

Riverpod `NotifierProvider` = Zustand `create()` di React. Familiar.

### Kenapa Syncfusion Charts

- **k_chart_plus**: MVP-friendly, free, cukup untuk 90% case
- **Syncfusion**: professional, TradingView-like, 50+ chart types, gratis
  di bawah $1M revenue/tahun (community license)
- **TradingView webview**: powerful tapi bukan native feel + branding TV

Untuk aplikasi trading long-term profesional, **Syncfusion pilihan tepat**.

---

## 4. Struktur Folder Flutter (Recommended)

```
garda_flutter/
├── android/                        # native shell
├── ios/
├── assets/
│   ├── translations/               # id.json, en.json (dari React)
│   ├── icons/
│   └── lottie/
├── lib/
│   ├── main.dart                   # entry + ProviderScope + easy_localization
│   ├── app.dart                    # MaterialApp + go_router
│   ├── config/
│   │   ├── constants.dart          # SUPPORTED_PAIRS, RR_OPTIONS, dll
│   │   ├── env.dart                # SUPABASE_URL, ANON_KEY (dari --dart-define)
│   │   └── theme.dart              # Garda dark/light theme
│   ├── router/
│   │   ├── app_router.dart         # go_router config
│   │   └── guards.dart             # auth + onboarding guards
│   ├── data/
│   │   ├── models/                 # freezed models (mirror TS types)
│   │   │   ├── user_profile.dart
│   │   │   ├── trade.dart
│   │   │   ├── daily_stats.dart
│   │   │   ├── ticker.dart
│   │   │   ├── ohlcv.dart
│   │   │   └── ...
│   │   ├── api/                    # edge function clients
│   │   │   ├── supabase_client.dart
│   │   │   ├── ccxt_proxy_api.dart
│   │   │   ├── execute_trade_api.dart
│   │   │   ├── close_trade_api.dart
│   │   │   ├── sync_trade_api.dart
│   │   │   └── connect_exchange_api.dart
│   │   └── repositories/           # business logic wrappers
│   │       ├── trade_repository.dart
│   │       └── market_repository.dart
│   ├── providers/                  # Riverpod providers
│   │   ├── auth_provider.dart      # auth state + profile stream
│   │   ├── trade_provider.dart     # activeTrade, tradesToday, cooldown
│   │   ├── ticker_provider.dart    # 5s poll
│   │   ├── ohlcv_provider.dart     # 15s poll
│   │   ├── balance_provider.dart
│   │   └── config_provider.dart    # app_config (phase, rules)
│   ├── features/
│   │   ├── auth/                   # Login, Signup, OAuth callback
│   │   ├── onboarding/             # Connect Exchange, Accept Rules
│   │   ├── trade/                  # TradePage (chart + order panel)
│   │   ├── stats/                  # daily stats, equity curve
│   │   ├── journal/                # trade history + emotion log
│   │   ├── locked/                 # account locked screen
│   │   └── settings/               # profile, theme, lang
│   ├── widgets/                    # shared UI
│   │   ├── candlestick_chart.dart
│   │   ├── order_panel.dart
│   │   ├── toast.dart
│   │   ├── loading_overlay.dart
│   │   └── ...
│   └── utils/
│       ├── formatters.dart         # formatUSDT, formatPrice, formatR
│       ├── error_translator.dart   # 50+ regex → human message
│       ├── logger.dart
│       └── validators.dart
└── test/
    ├── unit/
    ├── widget/
    └── integration/
```

---

## 5. API Contract — Edge Functions

Semua edge function di-invoke via `supabase.functions.invoke(name, body: {...})`.
Base URL: `https://zwmfavbdlzrftwhuewuk.supabase.co/functions/v1`

Auth: **JWT dari `supabase.auth.currentSession.accessToken`** dikirim
otomatis oleh `supabase_flutter` sebagai header `Authorization: Bearer ...`.

### 5.1 `execute-trade`

**Request:**
```dart
{
  'symbol': 'BTC/USDT',      // dari SUPPORTED_PAIRS
  'side': 'long' | 'short',
  'entryPrice': 95000.0,     // number
  'stopLoss': 94000.0,       // number
  'rrRatio': 2,              // dari RR_OPTIONS: 2, 3, atau 5
  'marginPercent': 25,       // 25/50/75/100
}
```

**Response (200 success):**
```dart
{
  'success': true,
  'trade': {                 // full trade row
    'id': 'uuid',
    'symbol': 'BTC/USDT',
    'side': 'long',
    'entry_price': 95000.0,
    'stop_loss': 94000.0,    // ROUNDED to exchange tick
    'take_profit': 97000.0,  // ROUNDED
    'quantity': 0.001,       // KOIN untuk Bybit/Binance/dll,
                             // CONTRACTS untuk Gate.io
    'exchange_order_id': '...',
    'exchange_sl_order_id': '...',
    'exchange_tp_order_id': '...',
    'status': 'open',
    'notes': null,           // atau error string kalau SL/TP gagal partial
    'opened_at': 'iso',
  },
  'positionDetails': { 'quantity', 'margin', 'takeProfit', 'riskAmount',
                       'potentialProfit', 'leverage' },
  'allChecks': [ ... ],      // 12 guardrail results
}
```

**Response (422 guardrail failed):**
```dart
{
  'success': false,
  'error': 'Guardrail checks failed',
  'failedChecks': [
    { 'name': 'cooldown', 'message': 'Cooldown 120 menit',
      'blocking': true },
    ...
  ],
  'allChecks': [ ... ],
}
```

**Response (500 exchange error):**
```dart
{
  'success': false,
  'error': 'bybit {"retCode":10001,...}',
  'type': 'Error',
}
```

**PENTING:** Supabase Flutter SDK `functions.invoke` untuk non-2xx return
`FunctionsHttpError`. Body JSON ada di `error.details`. Kode contoh:

```dart
try {
  final res = await supabase.functions.invoke(
    'execute-trade',
    body: request,
  );
  return res.data as Map<String, dynamic>;
} on FunctionException catch (e) {
  // FunctionException.details punya parsed body
  if (e.details is Map) return e.details as Map<String, dynamic>;
  rethrow;
}
```

### 5.2 `close-trade`

**Request:** `{ 'tradeId': 'uuid' }`

**Response (success):**
```dart
{
  'success': true,
  'trade': { ...updated trade row },
  'pnl': { 'usdt': -10.5, 'r': -1.0, 'isWin': false },
  'lockTriggered': { 'type': 'consecutive_loss',
                     'durationHours': 12, ... } | null,
  'evaluationTriggered': bool,
  'dailyStats': { 'tradesToday', 'consecutiveLosses', 'dailyLossR' },
}
```

### 5.3 `sync-trade` (auto-detect SL/TP fired)

**Request:** `{ 'tradeId': 'uuid' }`

**Response:**
```dart
// Position still open at exchange:
{ 'success': true, 'stillOpen': true }

// Already closed by previous sync/close call (idempotent):
{ 'success': true, 'alreadyClosed': true, 'trade': { ... } }

// SL/TP fired at exchange, sync-trade recorded the fill:
{
  'success': true,
  'stillOpen': false,
  'firedSide': 'sl' | 'tp' | 'manual',
  'trade': { ... closed trade row },
  'pnl': { 'usdt', 'r', 'isWin' },
  'lockTriggered': { ... } | null,
  'dailyStats': { ... },
}
```

**Usage pattern**: poll setiap 20s selama `activeTrade != null`. Kalau
response `stillOpen: false && !alreadyClosed`, tampilkan toast +
navigate ke post-trade modal. Sama seperti manual close.

### 5.4 `ccxt-proxy`

**Request:**
```dart
{
  'action': 'ticker' | 'ohlcv' | 'balance' | 'positions' | 'markets',
  'symbol': 'BTC/USDT',       // untuk ticker/ohlcv
  'timeframe': '15m',          // untuk ohlcv
  'limit': 100,                // untuk ohlcv
}
```

**Response:**
- `ticker` → `{ success: true, data: { last, bid, ask, high, low, volume, ... } }`
- `ohlcv` → `{ success: true, data: [{ time, open, high, low, close, volume }] }`
- `balance` → `{ success: true, data: { total_usdt, available_usdt, used_usdt } }`
- `positions` → `{ success: true, data: [{ symbol, side, size, entry_price, mark_price, unrealized_pnl }] }`

Recommended: **cache ticker & ohlcv di Riverpod stream provider dengan
Timer.periodic** — mirror pattern dari React `setTimeout` polling.

### 5.5 `connect-exchange`

**Request:**
```dart
{
  'exchange': 'bybit' | 'binance' | 'okx' | 'gateio' | ...,
  'apiKey': 'raw key',
  'apiSecret': 'raw secret',
}
```

Server encrypt AES-256-GCM lalu simpan di `profiles` table. TIDAK PERNAH
kirim ulang secret ke client.

**Response:**
```dart
{ 'success': true, 'balance': 1234.56 }  // verify balance readable
// atau
{ 'success': false, 'error': 'Invalid API key' }
```

---

## 6. 12 Guardrail Rules (server-side, jangan re-implement di client)

| Rule | Value Phase 1 | Enforced di |
|---|---|---|
| Leverage | 1x (hardcoded) | Server |
| Risk per trade | 1R / 1% equity | Server |
| Max positions | 1 | Server |
| Max trades/hari | 3 | Server |
| Daily loss limit | 3R | Server |
| Total drawdown | 10R | Server |
| Min RR | 1:2 | Server |
| Martingale block | 5 min window | Server |
| Averaging down | Blocked | Server |
| Manual lot size | Blocked | Server |
| Cooldown | 120 min | Server |
| Account lock | 3 consecutive loss / daily limit | Server |

Phase auto-progress:
- Phase 2 (Terlatih): unlock kalau win_rate ≥ 40% & trades ≥ 30
- Phase 3 (Professional): unlock kalau WR ≥ 50% & trades ≥ 60

Client TIDAK boleh bypass. Kalau server return 422, tampilkan message dari
`failedChecks[].message`.

---

## 7. SL/TP Behavior Per Exchange (sudah live, jangan ubah)

**Hybrid CCXT + Native REST:**
- Entry & close order → CCXT unified `createOrder` (stable)
- SL & TP → Native REST via `exchange.sign()` + `fetch()` (portable ke Dart!)

Yang sudah working (per 30 Juni 2026):

| Exchange | Entry | SL | TP | Notes |
|---|---|---|---|---|
| Bybit | ✅ | ✅ | ✅ | Auto-detect hedge mode → positionIdx |
| Binance | ✅ | ✅ | ✅ | STOP_MARKET + TAKE_PROFIT_MARKET |
| OKX | ✅ | ✅ | ✅ | CCXT conditional |
| Bitget | ✅ | ✅ | ✅ | loss_plan / profit_plan |
| KuCoin | ✅ | ✅ | ✅ | stop market + limit reduceOnly |
| **Gate.io** | ✅ | ✅ | ✅ | Butuh 6 hari debug — akhirnya work dengan native REST + schema resmi gateapi-python (nested initial+trigger, mark price, rule 1/2, dual-mode detect) |
| BingX, Bitfinex, BitMEX, CoinEx, Deribit, Huobi, Kraken, MEXC, Phemex, WhiteBIT, WOO X | ⚠️ Entry only, SL/TP belum di-test | | | Handler CCXT default, belum di-verify |

**Yang HARUS diingat untuk Flutter side:**
- `trade.quantity` unit **berbeda per exchange**:
  - Bybit/Binance/OKX/Bitget/KuCoin: **coin** (mis. 0.001 BTC)
  - **Gate.io: contracts integer** (mis. 6 contracts, 1 contract = quanto_multiplier coin)
- PnL calculation di server sudah handle konversi ini. Client tinggal display.

---

## 8. Auth Flow

Supabase Auth (email/password + Google OAuth).

```dart
// Init di main.dart
await Supabase.initialize(
  url: 'https://zwmfavbdlzrftwhuewuk.supabase.co',
  anonKey: '<VITE_SUPABASE_ANON_KEY>',
);

final supabase = Supabase.instance.client;

// Login
await supabase.auth.signInWithPassword(email: '...', password: '...');
// Google OAuth
await supabase.auth.signInWithOAuth(OAuthProvider.google,
  redirectTo: 'gardaflutter://login-callback');

// Listen auth state
supabase.auth.onAuthStateChange.listen((data) {
  // update Riverpod authProvider
});

// Get JWT (auto-attached to functions.invoke)
final jwt = supabase.auth.currentSession?.accessToken;
```

**Deep link setup:**
- Android: `intent-filter` di AndroidManifest untuk scheme `gardaflutter`
- iOS: `CFBundleURLSchemes` di Info.plist
- Supabase dashboard: tambahkan `gardaflutter://login-callback` di Auth → URL Configuration → Redirect URLs

---

## 9. Routes (mirror React router)

```dart
final router = GoRouter(
  routes: [
    GoRoute(path: '/', redirect: (_, __) => '/app/trade'),
    GoRoute(path: '/login', builder: (_, __) => LoginPage()),
    GoRoute(path: '/signup', builder: (_, __) => SignupPage()),
    GoRoute(path: '/onboarding/connect', builder: (_, __) => ConnectExchangePage()),
    GoRoute(path: '/onboarding/rules', builder: (_, __) => AcceptRulesPage()),
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child), // bottom nav
      routes: [
        GoRoute(path: '/app/trade', builder: (_, __) => TradePage()),
        GoRoute(path: '/app/stats', builder: (_, __) => StatsPage()),
        GoRoute(path: '/app/journal', builder: (_, __) => JournalPage()),
        GoRoute(path: '/app/settings', builder: (_, __) => SettingsPage()),
      ],
    ),
    GoRoute(path: '/app/locked', builder: (_, __) => LockedPage()),
    GoRoute(path: '/app/evaluation', builder: (_, __) => EvaluationPage()),
  ],
  redirect: (context, state) {
    // Route guards: check auth + onboarding
    ...
  },
);
```

---

## 10. State Management Pattern (Riverpod)

### Auth provider

```dart
@riverpod
class AuthState extends _$AuthState {
  @override
  Stream<Session?> build() {
    return Supabase.instance.client.auth.onAuthStateChange
      .map((event) => event.session);
  }
}

@riverpod
Future<UserProfile?> currentProfile(CurrentProfileRef ref) async {
  final session = await ref.watch(authStateProvider.future);
  if (session == null) return null;
  final res = await Supabase.instance.client
    .from('profiles')
    .select(kProfileClientColumns)
    .eq('id', session.user.id)
    .maybeSingle();
  return res == null ? null : UserProfile.fromJson(res);
}
```

### Active trade + sync polling

```dart
@riverpod
class ActiveTrade extends _$ActiveTrade {
  @override
  Trade? build() => null;

  Future<void> loadFromDb() async {
    final userId = ref.read(authStateProvider).value?.user.id;
    if (userId == null) return;
    final res = await Supabase.instance.client
      .from('trades')
      .select()
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('opened_at', ascending: false)
      .limit(1)
      .maybeSingle();
    state = res == null ? null : Trade.fromJson(res);
  }

  void set(Trade? t) => state = t;
}

// Poll sync-trade every 20s while activeTrade != null.
// Mirror React TradePage sync polling.
@riverpod
class SyncPoller extends _$SyncPoller {
  Timer? _timer;

  @override
  void build() {
    ref.onDispose(() => _timer?.cancel());
    final trade = ref.watch(activeTradeProvider);
    _timer?.cancel();
    if (trade == null) return;
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _poll(trade.id));
  }

  Future<void> _poll(String tradeId) async {
    // guard: tab visibility, ongoing submission, etc
    try {
      final res = await syncTradeApi.sync(tradeId);
      if (res['success'] == true && res['stillOpen'] == false
          && res['alreadyClosed'] != true) {
        ref.read(activeTradeProvider.notifier).set(null);
        // show toast + navigate to post-trade modal
        ref.read(toastProvider.notifier).show(
          res['firedSide'] == 'sl' ? 'SL Terpicu' : 'TP Terpicu',
          'PnL: ${res['pnl']['usdt']} USDT · ${res['pnl']['r']}R',
        );
      }
    } catch (_) { /* retry next tick */ }
  }
}
```

### Ticker stream (5s poll)

```dart
@riverpod
Stream<Ticker> tickerStream(TickerStreamRef ref, String symbol) async* {
  while (true) {
    try {
      final t = await ccxtProxyApi.fetchTicker(symbol);
      yield t;
    } catch (_) {}
    await Future.delayed(const Duration(seconds: 5));
  }
}
```

---

## 11. i18n

React pakai `i18next` dengan JSON di `public/locales/{lang}/*.json`. Copy
JSON tersebut ke Flutter `assets/translations/{lang}.json`, tinggal
`easy_localization` pakai key yang sama.

```dart
// main.dart
runApp(EasyLocalization(
  supportedLocales: const [Locale('id'), Locale('en')],
  path: 'assets/translations',
  fallbackLocale: const Locale('id'),
  child: const GardaApp(),
));

// usage:
Text('onboarding.rules_title'.tr())
```

---

## 12. Bugs & Learnings dari React version (JANGAN ULANGI)

### Gate.io — 6 hari debugging, akhirnya beres

**Root cause:** CCXT `createOrder(type='stop')` gagal karena tidak set
`trigger.rule` (1 atau 2). Fix: pakai native REST direct via
`exchange.sign()` dengan body schema resmi gateapi-python:

```dart
// Body untuk POST /api/v4/futures/usdt/price_orders
{
  'initial': {
    'contract': 'BTC_USDT',
    'size': 0,                            // full close on trigger
    'price': '0',                         // market order
    'tif': 'ioc',
    'reduce_only': true,
    'close': true,                        // single-mode
    // OR
    'auto_size': 'close_long',            // dual-mode
    'text': 't-garda',
  },
  'trigger': {
    'strategy_type': 0,
    'price_type': 1,                      // MARK price (anti-wick)
    'price': '95000',
    'rule': 1,                            // 1: price >= trigger
                                          // 2: price <= trigger
    'expiration': 604800,                 // 7 days
  },
}
```

Rule cheatsheet:
- Long SL: `rule=2` (trigger saat harga turun ke SL)
- Short SL: `rule=1`
- Long TP: `rule=1`
- Short TP: `rule=2`

Untuk Flutter re-implement (kalau nanti native REST langsung tanpa lewat
edge function): sama pattern. Tapi **rekomendasi: SEMUA panggilan trading
tetap lewat edge function**, jangan langsung dari client — API key user
tidak boleh masuk ke device.

### Bybit — hedge mode positionIdx

Akun hedge mode wajib kirim `positionIdx: 1` (long) / `2` (short) di
setiap order (entry + SL + TP + close). One-way mode: `0`.

Deteksi via `GET /v5/position/list` — kalau ada position dengan
positionIdx 1 atau 2, akun di hedge mode.

### Universal — SL/TP price precision

Exchange reject kalau trigger price bukan kelipatan `tickSize`. Server
sudah round via `exchange.priceToPrecision()`. **DB stop_loss dan
take_profit sudah RESULT dari rounding** — Flutter cukup display.

### Gate.io — quantity unit

`trade.quantity` untuk Gate.io = **integer contracts**, bukan coin.
Konversi ke coin butuh `quanto_multiplier` dari market info.
Server sudah handle di execute-trade + close-trade + sync-trade.

### PGRST116 error handling

Supabase PostgREST return PGRST116 kalau `.single()` panggil ke row
yang tidak ada. Selalu pakai `.maybeSingle()` untuk lookup yang
row-nya opsional (mis. `daily_stats` sebelum trade pertama hari itu).

### Error toast — parse FunctionsHttpError body

`supabase.functions.invoke` untuk non-2xx set error, TIDAK auto-parse
body. Kalau execute-trade return 422 dengan `failedChecks`, harus
extract dari `error.details` (Dart) / `error.context` (JS).

---

## 13. Environment Variables

Untuk Flutter, gunakan `--dart-define`:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://zwmfavbdlzrftwhuewuk.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<lihat .env.local React project> \
  --dart-define=APP_URL=https://garda-alpha.vercel.app
```

Untuk production: bake dengan `flutter build apk --dart-define=...` atau
pakai flavors + `flutter_flavorizr`.

Env vars di edge functions (`SUPABASE_SERVICE_ROLE_KEY`, `API_KEY_ENCRYPTION_SECRET`,
dll) TIDAK perlu di Flutter — hanya server-side.

---

## 14. Testing Strategy

1. **Unit tests** — models (freezed toJson/fromJson roundtrip), formatters,
   error_translator, providers (dengan ProviderContainer).
2. **Widget tests** — order panel input validation, toast display,
   chart rendering dengan mock data.
3. **Integration tests (patrol)** — full flow: signup → connect exchange
   (mock API key) → open position (mock edge function) → close.
4. **Manual QA** — real trading dengan akun kecil sebelum release.

---

## 15. Deployment

- **Android**: Google Play Console. Signing dengan `key.properties`.
  Build: `flutter build appbundle --release`.
- **iOS**: Apple Developer. TestFlight → App Store.
  Build: `flutter build ipa --release`.
- **CI/CD**: Codemagic.io (Flutter-native, gratis untuk 500 min/bulan)
  atau GitHub Actions.
- **Beta distribution**: Firebase App Distribution.

---

## 16. Timeline Estimasi (solo dev)

Mengasumsikan sudah familiar Dart:

| Milestone | Estimasi |
|---|---|
| Setup project + auth + routing | 1 minggu |
| Onboarding flow (connect exchange + accept rules) | 3 hari |
| TradePage: chart + order panel + polling | 2 minggu |
| Sync polling (`sync-trade` integration) | 2 hari |
| Stats + Journal pages | 1 minggu |
| Locked + evaluation screens | 3 hari |
| Settings + i18n + theme | 3 hari |
| Push notifications | 3 hari |
| Testing + polish | 1 minggu |
| **Total MVP** | **~6-7 minggu** |

Faktor yang bisa mempercepat: reuse asset (icons, translation JSON,
color palette) dari React project. Faktor yang bisa memperlambat:
learning Riverpod + Syncfusion, App Store review.

---

## 17. First Steps di Chat Session Baru

Prompt untuk mulai chat baru di VSCode (folder `garda_flutter/`):

```
Saya migrasi Garda dari React PWA ke Flutter. Backend Supabase project
zwmfavbdlzrftwhuewuk tetap dipakai. Baca dulu HANDOFF_FLUTTER.md di
../WebApplication/Garda/ untuk konteks lengkap (arsitektur, API
contracts, bugs sudah kena, stack pilihan).

Rencana session pertama:
1. Setup pubspec.yaml dengan stack yang direkomendasikan di doc
2. Init struktur folder lib/ sesuai section 4
3. Setup Supabase client + auth listener + go_router
4. Buat LoginPage minimal untuk test connect ke Supabase yang sudah ada

Jangan implement trading logic dulu — validate koneksi backend dulu.
```

---

## 18. Kontak & Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/zwmfavbdlzrftwhuewuk
- **Supabase Flutter docs**: https://supabase.com/docs/reference/dart
- **Riverpod docs**: https://riverpod.dev
- **Syncfusion Charts docs**: https://help.syncfusion.com/flutter/cartesian-charts/overview
- **go_router docs**: https://pub.dev/documentation/go_router/latest
- **CCXT docs (untuk reference exchange behavior)**: https://docs.ccxt.com
