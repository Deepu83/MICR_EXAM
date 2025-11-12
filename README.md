**************************************.....All End Point.......*****************************************************************
| Module         | Method | Endpoint                             | Description          |
| -------------- | ------ | ------------------------------------ | -------------------- |
| **User Auth**  | POST   | `/api/users/auth/register`           | Register a new user  |
|                | POST   | `/api/users/auth/login`              | User login           |
|                | PUT    | `/api/users/auth/update-profile/:id` | Update user profile  |
|                | PUT    | `/api/users/auth/request-edit/:userId`|User requests profile edit|
|                |PUT     |`/api/users/auth/approve-edit/:userId`| Admin approves or rejects profile edit request |
|                |POST    |`/api/users/auth/update-status-by-register`|Update exam status by registration number |
|                |GET     |`/api/users/auth/users`               |Get all registered users |
|                |GET     |`/api/users/auth/users/:userId`       |Get user details by ID|
|                |GET     |`/api/users/auth/edit/requests`       | Get all user edit requests pending admin approva|
|                |GET     |`/api/users/auth/dashboard-stats`     | Get dashboard statistics for users/admins |
|                |PUT     |  `/api/users/auth/users/progression` | Mark user step progression as passed (by admin) |
|                |POST    |`/api/users/auth/send-otp/:userId`    | Send OTP for profile update verification |
| **Admin Auth** | POST   | `/api/admin/auth/register`           | Register a new admin |
|                | POST   | `/api/admin/auth/login`              | Admin login          |
| **Exam**       | POST   | `/api/exams`                         | Create exam          |
|                | GET    | `/api/exams`                         | Get all exams        |
|                | GET    | `/api/exams/:id`                     | Get exam by ID       |
|                | PUT    | `/api/exams/:id`                     | Update exam          |
|                | DELETE | `/api/exams/:id`                     | Delete exam          |
|

| Module                     | Method | Endpoint                                      | Description |
| -------------------------- | ------ | --------------------------------------------- | ------------ |
| **Exam Registration**      | POST   | `/api/registrations/create-order`             | Create a new payment order before       registration |
|                            | POST   | `/api/registrations/verify-payment`           |Verify payment and complete registration |
|                            | GET    | `/api/registrations/`                         | Get all exam registrations |
|                            | GET    | `/api/registrations/:registrationId`          | Get registration details by registration ID |
|                            | PUT    | `/api/registrations/result/:registrationId`   | Update exam result for a specific 
|                            | GET    | `/api/registrations/admit-card/:applicationId`| Get admit card details by application ID |
|                            | GET    | `/api/registrations/step/:applicationId`      | Get step  details by application ID |


********************************************************************************************************************************
Module            	Method	                 Endpoint	                                         Description
|**Mock Test**    |  POST	|         |` /api/mocktest/create`|	                       Create a new mock test                  |
|	GET	          |                   |`/api/mocktest`|	                         Get all mock tests (without correct answers)|
|   GET	          |                   |`/api/mocktest/:id`|                    Get mock test by ID (without correct answers)|
|	POST	      |                   |`/api/mocktest/submit`|           Submit mock test answers and get candidate score|