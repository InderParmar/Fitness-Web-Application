//Assignment 3 by Fahad Ali Khan Date: 10/10/2019
//Server side code for Assignment 3
/// --------------
// CONFIGURATION : Express imports & other imports and express config   
/// --------------
//write the javascript to import express
const express = require("express")
const app = express()
const HTTP_PORT = process.env.PORT || 8080
// use a static resources folder
app.use(express.static('assets'))
// configure express to receive form field data
app.use(express.urlencoded({ extended: true }))
//setup handlebars
const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({
 extname: ".hbs",
 helpers: {
     json: (context) => { return JSON.stringify(context) }
 }
}));
app.set("view engine", ".hbs");
// setup sessions
const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
   resave: false,
   saveUninitialized: true
}))

/// -------------- 
/// Setup MongoDB
/// --------------
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://FahadAliKhan:4LBAfo4k9R69dPLE@cluster0.tsvf83y.mongodb.net/test");
//creating a collection 
const Schema = mongoose.Schema;
//User collection: every user will have a username and password.
const userSchema = new Schema({ username: String, password: String });
const user = mongoose.model("user", userSchema);
//Clases collection: every class will have a image name, class name, length
const classSchema = new Schema({ image: String, class_name: String, length: Number });
const classes = mongoose.model("classes", classSchema);
//Payment collection: every payment will have a username, class name, price before tax, total amount paid and date created
const paymentSchema = new Schema({ username: String, class_name: String, price: Number, total: Number, date: Date });
const payments = mongoose.model("payments", paymentSchema);

/// -------------------------------------------------------------------------------------------
///  -------------------------------        ENDPOINTS :      -----------------------------------
/// -------------------------------------------------------------------------------------------

// ///////////////////////////////////////////////////////////////////////////////////////////
// Inserted this is MongoDB Atlas                                                              
// [                                                                                        
//     {                                                                                   
//       "image": "yoga.jpg",                                                                 
//       "class_name": "Yoga",                                                                      
//       "length": 60                                                                                      
//     },                                                                                                                                        
//     {
//       "image": "Cardio.jpg",
//       "class_name": "Cardio",
//       "length": 180
//     },
//     {
//       "image": "weight.jpg",
//       "class_name": "weight",
//       "length": 120
//     }
//   ]
// ///////////////////////////////////////////////////////////////////////////////////////////
//  Inserted Admin logins as well 
// [
//     {
//         "username": "Admin",
//         "password": "Admin"
//     }
// ]
// ///////////////////////////////////////////////////////////////////////////////////////////

// GET / - returns the main page which is the Shedule page
app.get("/", async (req, res) => {
    console.log(`[DEBUG] GET request received at / endpoint`)
    
    // Function to add price to class objects
    const addPriceToClasses = (classList, pricePerMinute) => {
        const newClassList = [];
    
        for (let i = 0; i < classList.length; i++) {
            const classItem = classList[i];
            const classWithPrice = {
                ...classItem,
                price: classItem.length * pricePerMinute
            };
            newClassList.push(classWithPrice);
        }
    
        return newClassList;
    }
    

    try {
        const classes_found = await classes.find().lean();

        // Calculate the price for each class
        const pricePerMinute = 0.65;
        const classesWithPrice = addPriceToClasses(classes_found, pricePerMinute);

        const isLoggedIn = req.session.hasLoggedInUser || false;
        const isAdmin = (req.session.username === 'Admin'); // Update this condition based on how you identify an admin in your application.

        res.render('home', {layout: "layout", classes: classesWithPrice, isAdmin: isAdmin, isLoggedIn: isLoggedIn });
    } catch (err) {
        console.log(err)
    }
});





// Login Endpoint to Login 
app.post("/login", async (req,res) => {
    console.log(`[DEBUG] POST request received at /login endpoint`)
    // 1. get values from form fields
    const usernameFromUI = req.body.emailAddress // Update this to use 'username' instead of 'emailAddress'
    const passwordFromUI = req.body.password    
    console.log(`LOGIN Username: ${usernameFromUI}, Password: ${passwordFromUI}`)

    try {
        // Query the database collection for a user with the specified username
        const userFromDB = await user.findOne({username:usernameFromUI})

        // if not found, then output error
        if (userFromDB === null) {
            res.status(401).render("error", {layout: "layout", errorTitle: "Login Error", errorMessage: "Invalid username entered. Please try again."});
            // exit because we don't need to proceed
            return
        }
        // user found, check their password
        if (userFromDB.password === passwordFromUI) {
            // 4. if everything is ok, then log them in
            req.session.hasLoggedInUser = true
            req.session.username = userFromDB.username
            res.redirect("/")    // not sure if you taught this or not
            return       
        }
        else {
            // 5. if not, show error
                   res.render("error", {layout: "layout", errorTitle: "Invalid Password", errorMessage: "Be sure to include your password."});

            return
        }
    } catch (err) {
        console.log(err)
    }
})

app.post("/create-account", async (req, res) => {
    console.log(`[DEBUG] POST request received at /create-account endpoint`)
    // 1. get values from form fields
    const usernameFromUI = req.body.emailAddress // Update this to use 'username' instead of 'emailAddress'
    const passwordFromUI = req.body.password
    console.log(`SIGNUP: Username: ${usernameFromUI}, Password: ${passwordFromUI}`)

    try {
        // query user collection to see if user already exists
        const userFromDB = await user.findOne({username: usernameFromUI})

        if (userFromDB === null) {
            // if not found, then create new user an insert them into database
            const userToCreate = user({username: usernameFromUI, password: passwordFromUI })
            await userToCreate.save()
            // log the user in
            req.session.hasLoggedInUser = true
            req.session.username = userToCreate.username
            res.redirect("/")
            return
        }
        else {
            // if found, then output error message
            res.send(`ERROR: There already exists a user with this username: ${usernameFromUI}`)
            return 
        }
       
    } catch (err) {
        console.log(err)
    }    
})

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Error in destroying session:', err);
            res.status(500).send('Error in logging out');
        } else {
            res.redirect('/');
        }
    });
});


app.post("/book", async (req, res) => {
    console.log(`[DEBUG] POST request received at /book endpoint`);

    const class_name = req.body.class_name;
    const price = parseFloat(req.body.price);
    const isLoggedIn = req.session.hasLoggedInUser || false;
    const isAdmin = req.session.username === "Admin";

    if (isLoggedIn) {
        const username = req.session.username;
        const taxRate = 0.13;
        const total = parseFloat(price * (1 + taxRate)).toFixed(2);

        try {
           const newPayment = new payments({
                username: username,
                class_name: class_name,
                price: price,
                total: total,
                date: new Date(),
            });

            await newPayment.save();

            res.render("booking", {layout: "layout", class_name: class_name, price: price, total: total, isAdmin: isAdmin, isLoggedIn: isLoggedIn})
        } catch (err) {
            console.log(err);
            res.status(500).send("Error in booking the class.");
        }
    } else {
        res.render("error", {layout: "layout", errorTitle: "Not Logged In", errorMessage: "You must be logged in to book a class."});
    }
});



app.get("/cart", async (req, res) => {
    if (req.session.hasLoggedInUser) {
        try {
            const username = req.session.username;
            const userBookings = await payments.find({ username: username }).lean();
            const isLoggedIn = req.session.hasLoggedInUser || false;
            const isAdmin = req.session.username === "Admin";
 
            let total = 0;
            for (const booking of userBookings) {
                total += parseFloat(booking.total);
            }

            res.render("cart", {
                layout: "layout",
                bookings: userBookings,
                isAdmin: isAdmin,
                isLoggedIn: isLoggedIn,         
                total: total.toFixed(2),
            });
        } catch (err) {
            console.log(err);
        }
    } else {
        res.render("error", {errorTitle: "Not Logged In", errorMessage: "You must be logged in to access your cart."});
    }
});






app.get('/loginPage', (req, res) => {
    res.render('login', {layout: "layout"});
});


app.get("/Admin", async (req, res) => {
    console.log(`[DEBUG] GET request received at /admin endpoint`)
    console.log(req.session)
    if (req.session.hasLoggedInUser && req.session.username === "Admin") {
        try {
            const paymentRecords = await payments.find().sort({ date: 1 }).lean();
            const isLoggedIn = req.session.hasLoggedInUser || false;
            const isAdmin = req.session.username === "Admin";
            res.render("admin", {
                layout: "layout",
                payments: paymentRecords,
                isAdmin: isAdmin,
                isLoggedIn: isLoggedIn
            });
        } catch (err) {
            console.log(err);
            res.status(500).send("Error in accessing admin page.");
        }
    } else {
        res.status(401).render("error", {errorTitle: "Unauthorized Access", errorMessage: "You must be logged in as an admin to access this page."});
    }
});

app.post("/logout", (req, res) => {
    console.log(`[DEBUG] LOGOUT requested...`)
    req.session.destroy()
 
 
    console.log(`Session destroyed...`)
    console.log(req.session)
   
    res.send("You are logged out")
 
 }) 





/// --------------
// START THE SERVER : 
/// --------------
// function that will run when the server starts
const onHttpStart = () => {
    console.log(`Server is running on port ${HTTP_PORT}`)
    console.log(`Press CTRL+C to exit`)
 }
 // the code that actually runs the web server app
 app.listen(8080, onHttpStart)
 