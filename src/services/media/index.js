const express = require("express")

const uniqid = require("uniqid")
const { join } = require("path")
const { createReadStream } = require("fs-extra")
const { Transform } = require("json2csv")
const { pipeline } = require("stream")

const sgMail = require("@sendgrid/mail")


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
  
      const modifiedUser = {
        ...req.body,
        _id: req.params.id
       
      }
      media.push(modifiedUser)
      await writemedia(media)
      res.send(modifiedUser)
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





//CSV EXPORT
mediaRouter.get("/csv",async (req,res,next)=> {
  try {
    const path = join(__dirname, "media.json")
    const jsonReadableStream = createReadStream(path)

    const json2csv = new Transform({
      fields: ["firstName", "secondName", "email", "id"],
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
