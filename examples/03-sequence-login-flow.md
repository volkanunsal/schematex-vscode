# UML Sequence: Login Flow

A login request that validates credentials against a database, with success and failure branches.

```schematex
sequence "Login flow"
  actor User
  participant Web as "Web App"
  control Auth
  database DB
  User -> Web : submit(credentials)
  activate Web
  Web ->+ Auth : verify(credentials)
  Auth ->+ DB : SELECT user
  DB --> Auth : row
  deactivate DB
  alt [credentials valid]
    Auth --> Web : token
    Web --> User : 200 OK
  else [invalid]
    Auth --> Web : 401
    Web --> User : error
  end
  deactivate Auth
  deactivate Web
  note over User, Web : session cookie set
```
