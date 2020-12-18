const express = require("express")
const multer = require("multer")
const uniqid = require("uniqid")
const { join } = require("path")
const { createReadStream ,writeFile } = require("fs-extra")
const { Transform } = require("json2csv")
const path = require("path")
const upload = multer({})
const { pipeline } = require("stream")
const sgMail = require("@sendgrid/mail")
const mediaFolderPath = path.join(__dirname, "../../../public/img/media")
const { getmedia, writemedia } = require("../../fsUtilities")
const mediaRouter = express.Router()




//POST
mediaRouter.post("/",async (req,res,next)=> {
try{
  const media = await getmedia()

  const idFound = media.find(media => media.imdbId === req.body.imdbId)

  if (idFound) {
    const error = new Error()
    error.httpStatusCode = 400
    error.message = "media already in db"
    next(error)
  } else {
    media.push({...req.body,comments:[]})
    await writemedia(media)
    res.status(201).send("media s been posted successfully!")
  }}
catch(error){
  console.log(error)
  const err = new Error("An error occurred while reading from the file")
  next(err)
}
})

//GET
mediaRouter.get("/",async (req,res,next)=> {
  try{
    const media = await getmedia()
    if (req.query && req.query.Type) {
      const filteredmedia = media.filter(
       media =>
         media.hasOwnProperty("Type") &&
         media.Type=== req.query.Type
      )
      console.log(req.query)
      res.send(filteredmedia)
    } else {
    
    res.send(media)
   }
  }
  catch(error){
    console.log(error)
    const err = new Error("An error occurred while reading from the file")
    next(err)
  }
  })

//GET BY ID
mediaRouter.get("/:imdbID", async (req, res, next) => {
  try {
    const media = await getmedia()

    const mediaFound = media.find(media => media.imdbID === req.params.imdbID)

    if (mediaFound) {
      res.send(mediaFound)
    } else {
      const err = new Error()
      err.httpStatusCode = 404
      next(err)
    }
  } catch (error) {
    console.log(error)
    next(error)
  }
})

  //PUT
  mediaRouter.put("/:imdbID", async (req, res, next) => {

    try {
      const mediaDb = await getmedia()
      const mediaFound = mediaDb.find(media => media.imdbID === req.params.imdbID)
      if (mediaFound){
  
      const media= mediaDb.filter(media => media.imdbID !== req.params.imdbID)
  
      const modifiedMedia = {
        ...req.body,
        imdbID: req.params.imdbID
       
      }
      media.push(modifiedMedia)
      await writemedia(media)
      res.send(modifiedMedia)
    }else {
      const error = new Error()
      error.httpStatusCode = 404
      next(error)
    }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })
  //DELETe BY ID
  mediaRouter.delete("/:imdbID", async (req, res, next) => {
    try {
      const mediaDb = await getmedia()
      const mediaFound = mediaDb.find(media => media.imdbID === req.params.imdbID)
      if (mediaFound){
        const filteredmedia= mediaDb.filter(media => media.imdbID !== req.params.imdbID)
      await writemedia(filteredmedia)
      res.status(204).send()
      }
      else{
      const error = new Error()
      error.httpStatusCode = 404
      next(error)

      }
  
      
    } catch (error) {
      console.log(error)
      next(error)
    }
  })


  ///CRUD FOR REVİEWS

  // GET /media/:imdbID/reviews
  mediaRouter.get("/:imdbID/reviews", async (req, res, next) => {
    try {
      const media = await getmedia()
  
      const mediaFound = media.find(media => media.imdbID === req.params.imdbID)
  
      if (mediaFound) {
        
        res.send(mediaFound.review)
      } else {
        const err = new Error()
        err.httpStatusCode = 404
        next(err)
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })

  // POST /media/:imdbID/reviews
  mediaRouter.post("/:imdbID/reviews", async (req, res, next) => {
    try {
      const media = await getmedia()
  
      const mediaFound = media.find(media => media.imdbID === req.params.imdbID)
  
      if (mediaFound) {
        console.log(mediaFound)
        mediaFound.review.push({_id:uniqid(),...req.body,elementId:req.params.imdbID,createdAt:new Date(),Poster:'',})
      await writemedia(media)
      res.status(201).send("review has been posted successfully!")
        
      } else {
        const err = new Error()
        err.httpStatusCode = 404
        next(err)
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })

  // PUT /media/:imdbID/reviews/:_id
  mediaRouter.put("/:imdbID/reviews/:_id", async (req, res, next) => {
    try {
      const media = await getmedia()
      const mediaIndex = media.findIndex(
        media => media.imdbID === req.params.imdbID
      )
  
        if (mediaIndex!==-1 ) {
          const reviewIndex = media[mediaIndex].review.findIndex(
            review => review._id === req.params._id
          )
          if (reviewIndex !== -1) {
          const previousReview = media[mediaIndex].review[reviewIndex]

              const updateReviews = [
                ...media[mediaIndex].review.slice(0, reviewIndex),
                { ...previousReview, ...req.body, updatedAt: new Date() },
                ...media[mediaIndex].review.slice(reviewIndex + 1),
              ]
              media[mediaIndex].review = updateReviews
              await writemedia(media)
              res.send(media[mediaIndex])} else {
                console.log("Review not found")
              }
        
        } else {
        console.log("media not found!")
        }
    } catch (error) {
      console.log(error)
      next(error)
    
  }
})

//DELETE
mediaRouter.delete(
  "/:imdbID/reviews/:_id",
  async (req, res, next) => {
    try {
      const media = await getmedia()

      const mediaIndex = media.findIndex(
        media => media.imdbID === req.params.imdbID
      )

      if (mediaIndex !== -1) {
        media[mediaIndex].review = media[mediaIndex].review.filter(
          review => review._id !== req.params._id
        )

        await writemedia(media)
        res.send(media[mediaIndex])
      } else {
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
)

//UPLOAD IMAGE
mediaRouter.post("/:imdbID/upload", upload.single("movie"), async (req, res,next) => {
  try{
    
    await writeFile(
      path.join(mediaFolderPath, req.params.imdbID + ".jpg"),
      req.file.buffer
      )
     
     const media = await getmedia()
     const updated = media.map(media => media._imdbID ===req.params.imdbID ? {...media, Poster: req.params.imdbID + ".jpg"}: media)
    
     await writemedia(updated )
     res.send("ok")
   
}
catch(error){
  console.log(error)
  next(error)
}
})
  

//CSV EXPORT
mediaRouter.get("/csv",async (req,res,next)=> {
  try {
    const path = join(__dirname, "media.json")
    const jsonReadableStream = createReadStream(path)

    const json2csv = new Transform({
      fields: ["Title",  "Year", "imdbimdbID","Type","review","Poster"],
    })
    

    res.setHeader("Content-Disposition", "attachment; filename=export.csv")
    pipeline(jsonReadableStream, json2csv, res, err => {
      if (err) {
        console.log(err)
        next(err)
      } else {
        console.log("Done")
      }
    })
  } catch (error) {
    next(error)
  }
})
//SENDGRID
mediaRouter.post("/send", async (req, res, next) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const msg = {
      to: "helenstudyo@gmail.com",
      from: "hillcakmak@gmail.com",
      subject: "Sending with Twilio SendGrid is Fun",
      text: "and easy to do anywhere, even with Node.js",
      html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    }

    await sgMail.send(msg)
    res.send("sent")
  } catch (error) {
    next(error)
  }
})



module.exports = mediaRouter
