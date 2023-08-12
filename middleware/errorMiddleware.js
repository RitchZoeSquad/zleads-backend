const errorHandler = (err, req, res, next) => {
    res.status(200).json({
      success:false,
      message: err.message,
      stack: err.stack,
    })
  }
  
  module.exports= {errorHandler }
  