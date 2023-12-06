const http = require("http");
const mongoose = require("mongoose");
const bodyParser = require("body-parser"); // converting body into JSON
require("dotenv").config(); // 
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const PROPERTIES_URI = process.env.PROPERTIES_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB.."))
  .catch((err) => console.error("Could not connect to MongoDB..", err));
const db = mongoose.connection; // to check the state of MongoDB file

const propertySchema = new mongoose.Schema({
  type: String,
  size: String,
  price: Number,
  address: String,
  roomDistribution: String,
  link: [String],
  brokerName: String,
  brokerNumber: String,
  booked: Boolean,
});

const Property = mongoose.model("Property", propertySchema);

const server = http.createServer(async (req, res) => {
  // Enable CORS - Allow all origins (you might want to restrict this in a production environment)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

   // Check MongoDB connection status
   if (db.readyState !== 1) {  
    sendErrorResponse(res, 500, 'Server Down! Try Again Later.');
    return;
  }
  // if we add another method
  if (req.method === 'OPTIONS') {
    // Preflight request, respond with OK status
    res.writeHead(200);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/' || req.url === '/index.html') {
    serveStaticFile(res, 'index.html');
  } else if (req.url.startsWith('/css/')) {
    serveStaticFile(res, req.url);
  } else if (req.url.startsWith('/images/')) {
    serveStaticFile(res, req.url);
  } else if (req.url.startsWith(PROPERTIES_URI)) {
    bodyParser.json()(req, res, async () => {
    

      const [, endpoint, api, param] = req.url.split("/");
  
      try {
        switch (req.method) {
          case "POST":
            await handlePostRequest(req, res);
            break;
  
          case "GET":
            await handleGetRequest(req, res);
            break;
  
          case "PUT":
            await handlePutRequest(param, req, res);
            break;
  
          case "DELETE":
            await handleDeleteRequest(param, req, res);
            break;
  
          default:
            sendErrorResponse(res, 404, "Route Not Found!");
        }
      } catch (error) {
        console.error("Error processing request:", error);
        sendErrorResponse(res, 500, "Internal Server Error");
      }
    });
  } else {
    // Handle other routes or 404 Not Found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  // Use body-parser for parsing JSON bodies 
  
});

function sendErrorResponse(res, statusCode, errorMessage) {
  res.statusCode = statusCode;
  let title;
  switch(statusCode){
    case 400: title = 'Bad Request';
              break;
    case 404: title = 'Not Found';
              break;
    case 500: title = 'Server Down!';
              break;
    default: title = 'Something went wrong!';
  }
  res.end(JSON.stringify({ title: title, message: errorMessage }));
}

async function handlePostRequest(req, res) {
  if (req.url === PROPERTIES_URI && req.method === "POST") {
    try {
      const property = new Property(req.body);
      const result = await property.save();
      res.end(JSON.stringify({ message: "Property added", propertyId: result._id }));
    } catch (error) {
      console.error("Error processing create request:", error);
      sendErrorResponse(res, 400, "Invalid request body");
    }
  } else {
    sendErrorResponse(res, 404, "Route Not Found!");
  }
}

function serveStaticFile(res, url) {
  const filePath = path.join(__dirname, 'portfolio', url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }

    const contentType = getContentType(url);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getContentType(url) {
  if (url.endsWith('.html')) {
    return 'text/html';
  } else if (url.endsWith('.css')) {
    return 'text/css';
  } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (url.endsWith('.png')) {
    return 'image/png';
  } else if (url.endsWith('.gif')) {
    return 'image/gif';
  } else {
    return 'application/octet-stream';
  }
}

async function handleGetRequest(req, res) {
  if (req.url === PROPERTIES_URI && req.method === "GET") {
    try {
      const properties = await Property.find();
      res.end(JSON.stringify(properties));
    } catch (error) {
      console.error("Error processing get request:", error);
      sendErrorResponse(res, 500, "Internal Server Error");
    }
  } else {
    sendErrorResponse(res, 404, "Route Not Found!");
  }
}

async function handlePutRequest(param, req, res) {
  if (req.url.startsWith(PROPERTIES_URI) && param && req.method === "PUT") {
    try {
      const propertyId = param;
      const updatedData = req.body;
      await Property.findByIdAndUpdate(propertyId, updatedData);
      res.end(JSON.stringify({ message: "Property updated" }));
    } catch (error) {
      console.error("Error processing update request:", error);
      sendErrorResponse(res, 400, "Invalid request body");
    }
  } else {
    sendErrorResponse(res, 404, "Route Not Found!");
  }
}

async function handleDeleteRequest(param, req, res) {
  if (req.url.startsWith(PROPERTIES_URI) && param && req.method === "DELETE") {
    try {
      const propertyId = param;
      await Property.findByIdAndDelete(propertyId);
      res.end(JSON.stringify({ message: "Property deleted" }));
    } catch (error) {
      console.error("Error processing delete request:", error);
      sendErrorResponse(res, 400, "Invalid request body");
    }
  } else {
    sendErrorResponse(res, 404, "Route Not Found!");
  }
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
