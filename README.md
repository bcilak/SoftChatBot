# ChatKit workflow (wf_) chat bubble embed (Next.js App Router)

Bu repo, Agent Builder’da oluşturduğunuz **workflow ID (wf_...)** ile **Recommended ChatKit integration** yaklaşımını kullanarak, web sitenize tek bir `<script>` ile “chat bubble” embed etmenizi sağlar.

## Özellikler

- ✅ **wf_ workflow** ile uyumlu (Responses API model olarak çağırmaz; **ChatKit Sessions** kullanır)
- ✅ Backend: `POST /api/chatkit/session` → OpenAI `POST /v1/chatkit/sessions`
- ✅ Zorunlu header: `OpenAI-Beta: chatkit_beta=v1`
- ✅ **API key asla frontend’e gitmez** (sadece server env)
- ✅ CORS allowlist (`ALLOW_ORIGINS`) + IP bazlı rate limit (60 req/dk)
- ✅ Hata olunca client’a sade `{ error: "SESSION_CREATE_FAILED" }`, server’a detay log

## Kurulum

### 1) Env

`/.env.example` dosyasını kopyalayın:

- `OPENAI_API_KEY`
- `OPENAI_WORKFLOW_ID` (wf_...)
- `ALLOW_ORIGINS` (comma-separated)

Örn (local):

- `ALLOW_ORIGINS=http://localhost:3000`

> Next.js otomatik olarak `.env.local` okur. Önerilen: `.env.local` oluşturun.

### (Opsiyonel) Thread başlığı / history satırını gizleme

Chat ekranında üstte görünen thread başlığı (örn. “Turkish Hello Exchange”) genelde ChatKit **history / thread title** UI’sinden gelir.

Varsayılan olarak bu repo, daha minimal bir UI için şunları **kapalı** başlatır:

- `CHATKIT_HISTORY_ENABLED=false`
- `CHATKIT_AUTOMATIC_THREAD_TITLING_ENABLED=false`

İsterseniz `.env.local` içine ekleyerek açabilirsiniz.

Alternatif: Agent Builder’da workflow/thread başlığını değiştirirseniz görünen metin de değişebilir.

### 2) Çalıştırma

```bash
npm install
npm run dev
```

Demo:
- http://localhost:3000/index.html

## Embed (tek script)

Web sitenize şunu ekleyin:

```html
<script
  src="https://YOURDOMAIN.com/embed.js"
  data-api-base="https://YOURDOMAIN.com"
  data-title="Canlı Destek"
  data-position="right"
  data-primary="#111"
></script>
```

- `data-api-base`: Backend’in bulunduğu base URL
- `data-position`: `right` veya `left`

## Çoklu website + workflow yönetimi (opsiyonel)

Birden fazla websiteye embed edecekseniz ve workflow sayısı müşteri/site bazında değişecekse, server tarafında **site bazlı allowlist** kullanın.

### 1) Site config dosyası

[data/sites.json](data/sites.json) içinde her origin için workflow listesi tanımlanır:

- `origin`: tam Origin eşleşmesi (örn. `https://musteri-site.com`)
- `workflows`: `{ key, id (wf_), label }`
- `default_workflow_key`

> Not: `ALLOW_ORIGINS` yine CORS için zorunlu. Her siteyi `ALLOW_ORIGINS` içine ekleyin.

### 2) Frontend seçim

Embed widget, backend’den `GET /api/chatkit/workflows` ile allowlist’i çeker.

- 1 workflow varsa: sadece başlık gösterir.
- 2+ workflow varsa: dropdown ile workflow seçtirir ve seçimi localStorage’da saklar.

Seçim, session isteğine `workflow_key` olarak gider ve backend sadece allowlist’teki `wf_` id’lerine izin verir.

### 3) Admin endpoint (opsiyonel)

`ADMIN_API_KEY` set ederseniz, config’i uzaktan güncellemek için:

- `GET /api/admin/sites` (Bearer token gerekli)
- `POST /api/admin/sites` (origin + workflows ile upsert)

Bu endpoint’leri internete açacaksanız ekstra koruma (VPN, IP allowlist, auth, rate limit) önerilir.

## Backend endpoint

### `POST /api/chatkit/session`

Server-side olarak OpenAI ChatKit Sessions API çağrısı yapar:

- URL: `https://api.openai.com/v1/chatkit/sessions`
- Headers:
  - `Authorization: Bearer $OPENAI_API_KEY`
  - `Content-Type: application/json`
  - `OpenAI-Beta: chatkit_beta=v1`
- Body:
  - `workflow: { id: process.env.OPENAI_WORKFLOW_ID }`
  - `user: <anon_device_id_or_user_id>`

Response:

```json
{ "client_secret": "..." }
```

## Deploy notları

### Vercel

- Env vars: `OPENAI_API_KEY`, `OPENAI_WORKFLOW_ID`, `ALLOW_ORIGINS`
- Allowlist’e gerçek sitenizin origin’lerini ekleyin.

### Nginx / reverse proxy

- `next start` arkasına koyacaksanız `x-forwarded-for` header’ını doğru forward edin.
- HTTPS kullanın.

## Güvenlik notları

- `OPENAI_API_KEY` **sadece backend** env’de kalır.
- CORS allowlist exact-match yapar. `ALLOW_ORIGINS` boşsa **tüm cross-origin istekleri reddeder**.
- Rate limit in-memory’dir; çok instance’lı üretimde Redis/Upstash gibi paylaşımlı store önerilir.

## Dosyalar

- API route: [app/api/chatkit/session/route.ts](app/api/chatkit/session/route.ts)
- Server yardımcıları: [server/chatkit.ts](server/chatkit.ts)
- Embed script: [public/embed.js](public/embed.js)
- Demo: [public/index.html](public/index.html)
