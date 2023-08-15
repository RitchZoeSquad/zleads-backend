const express = require('express');
const dotenv = require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const cp = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');


connectDB();


// Connect to MongoDB database

  const app = express();    

  // Middleware
app.use(cors({origin:process.env.REACT_URL,credentials:true}))

  app.use(express.json());
  app.use(cp());
  app.use(express.static("public"))
  // API Routes

  
app.get("/",(req,res)=>{
  res.status(200).json({"success":true,"message":"server is working fine"})
})

  app.use('/api/users', userRoutes);

  // Error handling middleware
  app.use(errorHandler);

  // Next.js SSR handling

  const PORT = process.env.PORT || 8000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
