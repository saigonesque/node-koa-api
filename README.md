# HackerNews API Exercise

Built in Node + Koa

To run:
1. Install Node 8 or newer on your local machine
2. Clone repo to local folder
3. Enter folder in terminal and run npm install
4. run 'node app.js'

Endpoint 1
http://localhost:3000/25
* Top 10 most occurring words in the titles of the last 25 stories

Endpoint 2
http://localhost:3000/week
* Top 10 most occurring words in the titles of posts of exactly the last week


Endpoint 3
http://localhost:3000/experts
* Top 10 most occurring words in titles of the last 600 stories of users with at least 10.000 karma

TODO:
* Parallelize the search for endpoint 3
* Implement error handling
* Implement functional and unit tests
* Clean up code
