# Library Management System

A REST API for managing a small library: librarians add books, members reserve them, and librarians approve or reject reservations. Stock is tracked automatically as reservations change status.

Built with Node.js, Express, TypeScript, Sequelize and SQLite.

> **Authentication status:** login is not implemented yet. `middleware/auth.ts` is a development placeholder that identifies the caller from an `x-user-id` request header. This header can be faked by anyone, so the API must not be exposed publicly until the placeholder is replaced with real authentication.

## Features

- Member registration with hashed passwords (bcrypt)
- Librarian-only book management (add, update, deactivate)
- Reservation workflow with status tracking
- Automatic stock handling: reserving a book holds a copy, and rejecting, cancelling or returning releases it
- Role-based access: librarians manage everything, members see only their own reservations and active books

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Language | TypeScript |
| ORM | Sequelize 6 |
| Database | SQLite (`sqlite3`) |
| Password hashing | bcryptjs |
| Dev runner | tsx |

## Project Structure

```
LibraryManagement/
├── config/
│   └── database.ts          # Sequelize + SQLite connection
├── models/
│   ├── user.model.ts
│   ├── book.model.ts
│   ├── reservation.model.ts # includes the ReservationStatus enum
│   └── index.ts             # model associations
├── dto/                     # request whitelists and response shapes
├── controllers/             # business logic
├── routes/                  # URL → controller mapping
├── middleware/
│   └── auth.ts              # requireAuth, requireLibrarian (dev placeholder)
├── utils/
│   ├── pickDefined.ts       # copies only allowed fields from a request body
│   └── httpError.ts         # error with an HTTP status, used inside transactions
├── seed.ts                  # creates the first librarian
└── server.ts                # app entry point
```

Request flow: **route → auth middleware → controller → request DTO (whitelist) → model → response DTO → JSON**.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Install

```bash
cd LibraryManagement
npm install
```

### Configure the librarian account

Create a `.env` file in `LibraryManagement/`:

```
LIBRARIAN_EMAIL=librarian@example.com
LIBRARIAN_PASSWORD=choose-a-strong-password
```

If these are not set, the seed script falls back to default values. Do not commit `.env`; add it to `.gitignore`.

### Create the first librarian

```bash
npm run seed
```

Public registration can never create a librarian, so this script is the way to get the first one. If a user with that email already exists, they are promoted to librarian.

### Run

```bash
npm run dev      # development, auto-reloads
npm run build    # compile to dist/
npm start        # run the compiled build
```

The server starts at `http://localhost:3000`. The database file `library.sqlite` is created in the project root on first run and should not be committed.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run `dist/server.js` |
| `npm run seed` | Create or promote the librarian from `.env` |

## Data Model

**User**: `id`, `name`, `email` (unique), `password` (hash), `isLibrarian` (default `false`)

**Book**: `id`, `title`, `author`, `isbn` (unique, optional), `bookAmount` (copies currently available), `isActive`, `addedById` (the librarian who added it)

**Reservation**: `id`, `userId`, `bookId`, `status`

Relations: a User has many Books (added) and many Reservations; a Book has many Reservations.

### Reservation statuses

`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `RETURNED`

| From | Allowed next status |
|------|---------------------|
| `PENDING` | `APPROVED`, `REJECTED`, `CANCELLED` |
| `APPROVED` | `RETURNED`, `CANCELLED` |
| `REJECTED`, `CANCELLED`, `RETURNED` | none (final) |

### Stock rules

- `bookAmount` is the number of copies available on the shelf.
- Creating a reservation takes one copy immediately.
- Moving to `REJECTED`, `CANCELLED` or `RETURNED` gives the copy back.
- `APPROVED` keeps the copy held.
- Stock changes use a single conditional `UPDATE` inside a transaction, so two simultaneous requests cannot reserve the last copy twice.

### Permissions

| Action | Librarian | Member |
|--------|-----------|--------|
| Register | yes | yes |
| Add, update, deactivate books | yes | no |
| View books | all | active only |
| Create a reservation | yes | yes |
| View reservations | all | own only |
| Change reservation status | any allowed change | cancel own `PENDING` only |

## API Reference

Base URL: `http://localhost:3000`

All endpoints except registration require the header `x-user-id: <user id>` (development placeholder, see the note at the top).

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register a member |
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get one user |

Register body:

```json
{ "name": "Test User", "email": "test@example.com", "password": "secret123" }
```

The password is never returned. `isLibrarian` cannot be set through registration.

### Books

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/books` | any user | List books (members see active only) |
| GET | `/api/books/:id` | any user | Get one book |
| POST | `/api/books` | librarian | Add a book |
| PUT | `/api/books/:id` | librarian | Update a book |
| DELETE | `/api/books/:id` | librarian | Deactivate a book (`isActive = false`) |

Create body:

```json
{ "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "bookAmount": 3 }
```

`DELETE` deactivates instead of removing the row, so existing reservations stay valid.

### Reservations

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/reservations` | any user | Reserve a book |
| GET | `/api/reservations` | any user | List reservations (members see own) |
| GET | `/api/reservations/:id` | owner or librarian | Get one reservation |
| PATCH | `/api/reservations/:id/status` | see Permissions | Change status |

Create body:

```json
{ "bookId": 1 }
```

Status change body:

```json
{ "status": "APPROVED" }
```

### Common responses

| Code | Meaning |
|------|---------|
| 200 / 201 | Success / created |
| 400 | Missing or invalid input |
| 401 | No valid user in `x-user-id` |
| 403 | Not allowed for this role |
| 404 | Not found (or not visible to this user) |
| 409 | Conflict: duplicate email or ISBN, no copies available, existing open reservation, or invalid status change |
| 500 | Server error |

## Example: a full reservation cycle

1. Librarian adds a book with `bookAmount: 1`.
2. Member sends `POST /api/reservations` with the book id. Status is `PENDING` and `bookAmount` becomes 0.
3. A second member tries to reserve the same book and gets `409` (no copies available).
4. Librarian sends `PATCH /api/reservations/:id/status` with `APPROVED`.
5. Librarian sends `RETURNED`. `bookAmount` goes back to 1.

## Known Limitations and Next Steps

- Authentication is a development placeholder (`x-user-id` header). Replace `middleware/auth.ts` with real login and token verification; the routes do not need to change.
- The database schema is synchronised with `sequelize.sync({ alter: true })`. SQLite rebuilds tables for each alteration, so the startup code turns foreign keys off during sync. Migrations would be a more robust approach for long-term use.
- Reservations have no due date or overdue handling.
- No web UI yet.
- No automated tests.

## License

ISC
