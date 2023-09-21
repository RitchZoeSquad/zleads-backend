const errorHandler = (err, req, res, next) => {
  console.log(err.message)
    res.status(200).json({
      success:false,
      message: err.message,
      stack: err.stack,
    })
  }
  
  module.exports= {errorHandler }
  



