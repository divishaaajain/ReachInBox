# ReachInBox

1. clone this repository

2. git clone https://github.com/divishaaajain/ReachInBox.git

3. run "npm install" -> to install node modules

4. run "npm run dev" -> to start the development server

5. Create account on Google api console and get the credentials

6. create .env file add your credentials

- .env should look like given below
  CLIENT_ID=***
  CLIENT_SECRET=***
  REDIRECT_URI="Create redirect uri (http://localhost:{PORT}/auth/google/callback) on Google API console"
  REFRESH_TOKEN=***
  PORT=****
  OPENAI_SECRET_KEY=***

7. Hit the endpoint http://localhost:{PORT}/auth/google. Sign in with your google account and give permissions to all the scopes

8. After successful signin, open another tab and hit the following endpoint
- http://localhost:{PORT}/fetch/:{your_signed_in_email}

9. Now you will see your emails will have tags, and for those emails a message would have been reverted back to the sender.

10. We can eliminate the manual effort of point 8 if sessions are managed.


