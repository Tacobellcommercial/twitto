require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");

mongoose.connect("mongodb+srv://tacobellcommercial:" + "hVPuHndcaAs5fe4r" + "@cluster0.8asjxa5.mongodb.net/?retryWrites=true&w=majority");

const app = express();

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  description: String,
  twits: [],
  likedTwits: []
});

const twitSchema = new mongoose.Schema({
  author: String,
  content: String,
  likes: Number,
  comments: []
})

const User = mongoose.model("User", userSchema);

const Twit = new mongoose.model("Twit", twitSchema);

passport.use(new LocalStrategy(function verify(username, password, callback){
  User.findOne({name: username}, (err, userObject)=>{
    if (err){
      return callback(err);
    }
    if (!userObject){
      return callback(null, false, {message: "Incorrect username or password!"});
    }

    bcrypt.compare(password, userObject.password, (err, result)=>{
      if (err){
        return callback(err);
      }
      if (result == false){
        return callback(null, false, {message: "Incorrect username or password!"});
      }

      return callback(null, userObject);

    })
  })
}));

passport.serializeUser((userObject, callback)=>{
  process.nextTick(()=>{
      callback(null, {id: userObject._id, username: userObject.name});
  });
});

passport.deserializeUser((userObject, callback)=>{
  process.nextTick(()=>{
    return callback(null, userObject);
  });
});

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine", "ejs")

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}))


app.use(passport.authenticate("session"));

const mainHeaderParams = {visibility: "none", visibilityTwo: "block", id: ""};

app.get("/", (req, res)=>{
  res.redirect("/home");
})

app.get("/home", (req, res)=>{
  if (req.isAuthenticated()){
    res.render("Home", {visibility: "block", visibilityTwo: "none", id: req.user.id, text: "Profile", link: "/profile/"+req.user.id});
  }else{
    res.render("Home", {visibility: "none", visibilityTwo: "block", id: "", text: "Login", link: "/login"});
  }
})

app.get("/search/:keyword", (req, res)=>{
  var keyword = req.params.keyword.toLowerCase();

  var relevantTwits = [];

  var relevantUsers = [];

  var trendingTwits = [];

  Twit.find({}, (err, result)=>{
    if (err){
      res.render("Error");
    }else{
      for (let i = 0; i<3; i++){
        trendingTwits.push(result[i]);
      }
      result.forEach(twitElement=>{
        var words = twitElement.content.split(" ");
        words.forEach(word=>{
          if (word.toLowerCase() == keyword){
            relevantTwits.push(twitElement);
          }
        })
      })

      User.find({}, (err, result)=>{
        if (err){
          res.render("Error");
        }else{
          for (let i = 0; i<result.length; i++){
            var twitElement = result[i];
            var twitElementAuthor = twitElement.name.toLowerCase();

            if (twitElementAuthor.includes(keyword)){
              relevantUsers.push(twitElement);
            }

          }

          if (req.isAuthenticated()){
            res.render("Search", {visibility: "block", visibilityTwo: "none", id: req.user.id, relevantTwits: relevantTwits, relevantUsers: relevantUsers, trendingTwits: trendingTwits, keyword: req.params.keyword});
          }else{
            res.render("Search", {visibility: "none", visibilityTwo: "block", id: "", relevantTwits: relevantTwits, relevantUsers: relevantUsers, trendingTwits: trendingTwits, keyword: req.params.keyword});
          }
        }
      })
    }
  })

})

app.post("/search", (req, res)=>{
  const keyword = req.body.keyword;
  res.redirect("/search/" + keyword);
})

app.get("/twit", (req, res)=>{
  if (req.isAuthenticated()){

    Twit.find({author: req.user.username}, (err, updatedArray)=>{
      if (err){
        res.render("Error");
      }else{
        res.render("Twit", {visibility: "block", visibilityTwo: "none", id: req.user.id, username: req.user.username, array: updatedArray});
      }
    })
  }else{
    res.redirect("/login");
  }
})

app.post("/twit", (req, res)=>{
  if (req.isAuthenticated()){
    const twitObject = new Twit({
      author: req.user.username,
      content: req.body.content,
      likes: 0,
      comments: []
    })

    twitObject.save().then(savedObject=>{
      if (twitObject === savedObject){
        User.findOneAndUpdate({_id: req.user.id}, {$push: {twits:savedObject}}, (err, success)=>{
          if (err){
            res.render("Error");
          }else{
            res.redirect("/twit");
          }
        })
      }else{
        res.render("Error");
      }
    })
  }
})

app.post("/like", (req, res)=>{
  if (req.isAuthenticated()){
    const objectId = req.body.objectId;
    User.find({_id: req.user.id}, (err, result)=>{
      if (err){
        res.render("Error");
      }else{
        var removeLike = false
        result[0].likedTwits.forEach(element=>{
          if (element._id == objectId){
            removeLike = true
            User.findOneAndUpdate({_id: req.user.id}, {$pull: {likedTwits: {_id: element._id}}}, (err)=>{
              if (err){
                res.render("Error");
              }else{
                Twit.find({_id: objectId}, (err, object)=>{
                  if (err){
                    res.render("Error");
                  }else{
                    Twit.findOneAndUpdate({_id: objectId}, {likes: object[0].likes-1}, (err)=>{
                      if (err){
                        res.render("Error")
                      }else{
                        res.redirect("/twits/" + objectId);
                      }
                    })
                  }
                })
              }
            })
          }
        })

        if (!removeLike){
          Twit.find({_id: objectId}, (err, object)=>{
            if (err){
              res.render("Error");
            }else{
              Twit.findOneAndUpdate({_id: objectId}, {likes: object[0].likes+1}, (err)=>{
                if (err){
                  res.render("Error");
                }else{
                  User.findOneAndUpdate({_id: req.user.id}, {$push: {likedTwits: object[0]}}, (err)=>{
                    if (err){
                      res.render("Error");
                    }else{
                      res.redirect("/twits/" + objectId);
                    }
                  })
                }
              })
            }
          })
        }
      }
    })
  }else{
    res.redirect("/login");
  }
});

app.get("/profile/:id", (req, res)=>{
  const id = req.params.id;
  User.find({_id: id}, (err, result)=>{
    if (err){
      res.render("Error");
    }
    if (result.length === 0){
      res.render("Error");
    }else{
      Twit.find({author: result[0].name}, (err, updatedArray)=>{
        if (err){
          res.render("Error");
        }else{
          if (req.isAuthenticated()){
            res.render("Profile", {visibility: "block", visibilityTwo: "none", username: result[0].name, twitsArray: updatedArray, description: result[0].description, id: req.user.id});
          }else{
            res.render("Profile", {visibility: "none", visibilityTwo: "block", username: result[0].name, twitsArray: updatedArray, description: result[0].description, id: ""});
          }
        }
      })
    }
  })
})

app.get("/twits/:id", (req, res)=>{
  const id = req.params.id;
  Twit.find({_id: id}, (err, result)=>{
    if (err){
      res.render("Error");
    }
    if (!result){
      res.render("Error");
    }else{
      User.find({name: result[0].author}, (err, authorObject)=>{
        if (err){
          res.render("Error");
        }
        if (result.length === 0){
          res.render("Error");
        }else{
          if (req.isAuthenticated()){
            res.render("TwitObject", {visibility: "block", visibilityTwo: "none", id: req.user.id, result: result[0], nameifLogin: req.user.username, authorId: authorObject[0]._id});
          }else{
            res.render("TwitObject", {visibility: "none", visibilityTwo: "block", id: "", result: result[0], nameifLogin: "notLoggedIn", authorId: authorObject[0]._id});
          }
        }
      })
    }
  })
})

app.post("/comment", (req, res)=>{
  if (req.isAuthenticated()){
    const data = req.body;
    const commentData = {author: data.name, content: data.content, userId: data.userId}
    Twit.findOneAndUpdate({_id: data.id}, {$push: {comments: commentData}}, (err, success)=>{
      if (err){
        res.render("Error");
      }else{
        res.redirect("/twits/" + data.id);
      }
    })
  }else{
    res.redirect("/login");
  }
})

app.get("/login", (req, res)=>{
  if (req.isAuthenticated()){
    res.redirect("/twit");
  }else{
    res.render("Login", mainHeaderParams);
  }
})

app.post("/login", passport.authenticate("local", {
  successRedirect: "/twit",
  failureRedirect: "/login"
}))

app.get("/register", (req, res)=>{
  if (req.isAuthenticated()){
    res.redirect("/twit");
  }else{
    res.render("Register", {passwordIncorrect: "false", passwordShort: "false", accountTaken: "false", visibility: "none", visibilityTwo: "block", id: ""});
  }
})

app.post("/register", (req, res)=>{
  let data = req.body;
  User.findOne({name: data.username}, (err, userObject)=>{
    if (err){
      return err;
    }
    if (!userObject){
      if (req.body.password.length < 7){
        res.render("Register", {passwordIncorrect: "false", passwordShort: "true", accountTaken: "false", visibility: "none", visibilityTwo: "block", id: ""});
      }else if(req.body.password !== req.body.confirmpassword){
        res.render("Register", {passwordIncorrect: "true", passwordShort: "false", accountTaken: "false", visibility: "none", visibilityTwo: "block", id: ""});
      }else{
        bcrypt.hash(data.password, 10, (err, hash)=>{
          if (err){
            res.redirect("/register");
          }
          const newUser = new User({
            name: data.username,
            password: hash,
            description: "No description",
            twits: [],
            likedTwists: []
          })

          newUser.save().then(savedObject=>{
            if (newUser === savedObject){
              res.redirect("/home");
            }else{
              res.redirect("/register");
            }
          });

        })
      }
    }else{
      res.render("Register", {passwordIncorrect: "false", passwordShort: "false", accountTaken: "true", visibility: "none", visibilityTwo: "block", id: ""});
    }
  })
})

app.post("/logout", (req, res)=>{
  if (req.isAuthenticated()){
    req.logout();
    req.session.destroy((err)=>{
      res.redirect("/home");
    });
  }
})


app.listen(process.env.PORT, ()=>{
  console.log("Listening on 3000");
})
