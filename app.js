require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');



const app = express()
app.get('/login', (req, res) => {
    res.redirect('./index.html')
})

app.use(express.static('public'));


//config json response
app.use(express.json())





//Models
const User = require('./models/User')

//open route - public Route
app.get('/', (req, res) => {
    res.status(200).json({ msg: 'Bem vindo a nossa API' })
})



var bodyParser = require('body-parser');
// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


var smtpConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: 'noreply.sweetdrinks@gmail.com',
        pass: 'jatkjelqvxloubtv'
    }
};
var smtpTransport = nodemailer.createTransport(smtpConfig);



//Private Route
app.get("/user/:id", checkToken, async (req, res) => {
    const id = req.params.id

    //check if user exists
    const user = await User.findById(id, '-password')


    if (!user) {
        return res.status(404).json({ msg: 'usuário não encontrado' })
    }

    res.status(200).json({ user })
})

function checkToken(req, res, next) {

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).json({ msg: 'Acesso Negado' })
    }

    try {

        const secret = process.env.SECRET

        jwt.verify(token, secret)

        next()
    } catch (error) {
        res.status(400).json({ msg: 'Token Invalido!' })

    }
}





//Register User
app.post('/auth/register', async (req, res) => {

    const { name, email, password, confirmpassword } = req.body

    if (!email.includes("@") && !email.includes(".")) {
        return res.status(422).json({ msg: 'Insira um email valido ' })
    }


    // validations
    if (!name) {
        return res.status(422).json({ msg: 'O nome é obrigatório ' })
    }

    if (!email) {
        return res.status(422).json({ msg: 'O email é obrigatório ' })
    }

    if (!password) {
        return res.status(422).json({ msg: 'A senha é obrigatória ' })
    }

    if (password !== confirmpassword) {
        return res.status(422).json({ msg: 'As senhas devem ser iguais!' })
    }

    // check if user exists

    const userExists = await User.findOne({ email: email })

    if (userExists) {
        return res.status(422).json({ msg: 'Email ja Utilizado, tente outro por favor' })
    }


    // create password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    //create user
    const user = new User({
        name,
        email,
        password: passwordHash,
    })


    try {

        await user.save()



        res.redirect('/login');


    } catch (error) {

        console.log(error)

        res.status(500).json({
            msg: 'Infelizmente ocorreu um erro com o servidor tente novamente mais tarde!'
        })
    }
})

//recoveryPassword

app.post("/auth/recovery", async (req, res) => {

    let email = req.body.email;

    const user = await User.findOne({ email: email })

  if (!user) {
        return res.status(404).json({ msg: 'Usuario nao encontrado!' })
    } else {


      

        var message = {
            from: process.env.SMTP_USERNAME,
            to: email,
            subject: ` Recuperação de Senha`,
            text: "",
            html: `
        <div>
          <h1>Recuperação de Senha</h1>
            <h2>Senha de recuperação atual: ${user.password}</h2>
    
        </div>`
        };
    
        smtpTransport.sendMail(message, (error, response) => {
            if (error) {
    
                console.log(error)
            } else {
                console.log("Email enviado: " + response.message);
                smtpTransport.close();
                res.redirect("/login");
            }
    
        });
    } ;



})

// Login user
app.post("/auth/login", async (req, res) => {

    const { email, password } = req.body
    console.log("REQ", req.body)

    console.log(email + password)
    //Validations
    if (!email) {
        return res.status(422).json({ msg: 'O email é obrigatório! ' })
    }

    if (!password) {
        return res.status(422).json({ msg: 'A senha é obrigatória! ' })
    }


    //Check if user exists
    const user = await User.findOne({ email: email })

    if (!user) {
        return res.status(404).json({ msg: 'Usuario nao encontrado!' })
    }


    //Check if password match
    let checkPassword = await bcrypt.compare(password, user.password)
     if(password == user.password){
            checkPassword = true;
        }

    if (!checkPassword) {

    
       

            return res.status(404).json({ msg: 'Senha invalida!' })
        
    

    }

    try {

        const secret = process.env.SECRET

        const token = jwt.sign(
            {
                id: user.id
            },
            secret,
        )

        if (res.status(200)) {
            res.redirect('./../Bebidas.html')
        }

    } catch (err) {
        console.log(error)

        res.status(500).json({
            msg: 'Infelizmente ocorreu um erro com o servidor tente novamente mais tarde!'
        })
    }
})

module.exports = app;

//Credencials
const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS
mongoose
    .connect(
        `mongodb+srv://${dbUser}:${dbPassword}@cluster0.acnwzzm.mongodb.net/?retryWrites=true&w=majority`,
    )
    .then(() => {
        app.listen(3000)
        console.log('conectou ao banco!')
    })
    .catch((err) => console.log)


