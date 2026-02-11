![MERN](https://img.shields.io/badge/Stack-MERN-green)
![JWT](https://img.shields.io/badge/Auth-JWT-blue)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)
![License](https://img.shields.io/badge/License-MIT-yellow)

# 🧠 Task Management System (MERN + JWT + Role Based Access)

A full-stack enterprise-ready Task Management System built using the MERN stack with secure cookie-based authentication, role-based access control (RBAC), and permission management.

---

## 📌 Features

### 🔐 Authentication
- JWT-based authentication
- HttpOnly cookie storage
- Secure login/logout
- Session timeout handling

### 👥 Role & Permission System
- Super Admin / Admin / Custom Roles
- Dynamic permission assignment
- Protected routes (Frontend + Backend)
- Role-based sidebar rendering

### 📋 Task Management
- Create, Edit, Delete tasks
- Assign tasks to users
- Task status tracking
- Dashboard statistics

### 👤 User Management
- Add users via email
- Auto-generated password system
- Role assignment
- Active/Inactive status

### ⚙️ Settings
- Profile update
- Password change
- Super Admin system controls
- Session configuration

### 🧵 Advanced Backend
- Worker Threads for heavy file handling
- Morgan request logging
- Modular route structure
- Clean middleware architecture

---

## 🛠 Tech Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Context API
- Modern CSS

### Backend
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose
- JWT
- Bcrypt
- Morgan
- Worker Threads

---

## 📂 Project Structure

PROJECT/
├── Backend/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── workers/
│ └── server.js
│
├── Frontend/
│ ├── src/
│ │ ├── pages/
│ │ ├── components/
│ │ ├── api/
│ │ └── App.jsx
│
└── README.md

---

## 🔒 Security Highlights

- JWT stored in HttpOnly cookies
- Role-based middleware authorization
- Protected API routes
- CORS properly configured
- Environment variables secured

---

## 🧠 Future Improvements

- Refresh tokens
- Audit logs
- Activity tracking
- File processing queue (Bull + Redis)
- Deployment (Render / Vercel)

---

## 👨‍💻 Author

**BIKASH RATAN SAHOO**
- GitHub: https://github.com/bikashcbtlpl

---

## 📄 License

This project is open-source and available under the MIT License.


