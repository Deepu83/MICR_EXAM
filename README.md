**************************************.....All End Point.......*****************************************************************
| Module         | Method | Endpoint                             | Description          |
| -------------- | ------ | ------------------------------------ | -------------------- |
| **User Auth**  | POST   | `/api/users/auth/register`           | Register a new user  |
|                | POST   | `/api/users/auth/login`              | User login           |
|                | PUT    | `/api/users/auth/update-profile/:id` | Update user profile  |
| **Admin Auth** | POST   | `/api/admin/auth/register`           | Register a new admin |
|                | POST   | `/api/admin/auth/login`              | Admin login          |
| **Exam**       | POST   | `/api/exams`                         | Create exam          |
|                | GET    | `/api/exams`                         | Get all exams        |
|                | GET    | `/api/exams/:id`                     | Get exam by ID       |
|                | PUT    | `/api/exams/:id`                     | Update exam          |
|                | DELETE | `/api/exams/:id`                     | Delete exam          |
|**
