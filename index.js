const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jxswzw8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) =>{
    console.log('hitting verifyJWT');
    console.log(req.headers.authorization);
    const authorization = req.headers.authorization;
    if(!authorization){
      res.status(401).send({error: true, message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    console.log('token inside', token);
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded)=>{
      if(error){
        return res.status(403).send({error: true, message: 'Unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const checkoutCollection = client.db('carDoctor').collection('checkout');

    // jwt
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '10h'})
      console.log(token);
      res.send({token})
    })

    // services
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: {title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // checkout

    app.get('/checkout', verifyJWT, async(req, res) =>{
      // console.log(req.headers.authorization);
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await checkoutCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/checkout', async(req, res) =>{
      const checkout = req.body;
      console.log(checkout);
      const result = await checkoutCollection.insertOne(checkout);
      res.send(result)
    })

    // single property কে আপডেট করলে put হবে না patch হবে।
    app.patch('/checkout/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        }
      }
      const result = await checkoutCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete('/checkout/:id', async (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await checkoutCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});

app.listen(port, () => {
  console.log(`Car Doctor Server is Running on port ${port}`);
});
