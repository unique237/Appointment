const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const twilio = require("twilio");
const path = require("path");

const app = express();
const port = 3000;

// Twilio setup a decocher pendant l'utilisation
// const accountSid = "your_accoundSid";
// const authToken = "your_authentificatorToken";
// const client = twilio(accountSid, authToken);
// const senderPhone = "+your phone_number_twilio";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Data files
const usersFile = "./data/users.json";
const appointmentsFile = "./data/appointments.json";

// Utility to read/write JSON
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// 2FA Variables
let otp = null;
let currentUser = null;

// Routes
app.get("/", (req, res) => res.redirect("/login"));

// Login page
app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(usersFile);

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    currentUser = user;
    otp = Math.floor(100000 + Math.random() * 900000); // Generate OTP
    client.messages
      .create({
        body: `Your OTP is ${otp}`,
        from: senderPhone,
        to: user.phone,
      })
      .then(() => res.redirect("/otp"))
      .catch((err) => console.error(err));
  } else {
    res.send("Invalid credentials.");
  }
});

// Registration page
app.get("/register", (req, res) => res.render("register"));

app.post("/register", (req, res) => {
  const { username, password, phone } = req.body;

  if (!username || !password || !phone) {
    return res.send("All fields are required!");
  }

  const users = readJSON(usersFile);

  if (users.some((user) => user.username === username)) {
    return res.send("Username already exists.");
  }

  if (users.some((user) => user.phone === phone)) {
    return res.send("Phone number already exists.");
  }

  const newUser = { username, password, phone };
  users.push(newUser);
  writeJSON(usersFile, users);

  res.redirect("/login");
});

// OTP verification
app.get("/otp", (req, res) => res.render("otp"));

app.post("/otp", (req, res) => {
  if (parseInt(req.body.otp) === otp) {
    res.redirect("/schedule");
  } else {
    res.send("Invalid OTP.");
  }
});

// Schedule appointment
app.get("/schedule", (req, res) => res.render("schedule"));

app.post("/schedule", (req, res) => {
  const { date, time } = req.body;
  const appointments = readJSON(appointmentsFile);

  const newAppointment = {
    user: currentUser.username,
    date,
    time,
    id: Date.now(),
  };

  appointments.push(newAppointment);
  writeJSON(appointmentsFile, appointments);

  // Schedule reminder SMS
  setInterval(() => {
    const now = new Date();
    const appointmentDate = new Date(`${date}T${time}:00`);
    const timeDifference = appointmentDate - now;

    if (timeDifference <= 30 * 60 * 1000 && timeDifference > 0) {
      client.messages
        .create({
          body: `Reminder: You have an appointment scheduled for ${date} at ${time}.`,
          from: senderPhone,
          to: currentUser.phone,
        })
        .catch((err) => console.error(err));
    }
  }, 2 * 60 * 1000); // Runs every 2 minutes

  res.redirect("/manage");
});

// Manage appointments
app.get("/manage", (req, res) => {
  const appointments = readJSON(appointmentsFile).filter(
    (appt) => appt.user === currentUser.username
  );
  res.render("manage", { appointments });
});

app.post("/cancel", (req, res) => {
  const { id } = req.body;
  let appointments = readJSON(appointmentsFile);

  appointments = appointments.filter((appt) => appt.id !== parseInt(id));
  writeJSON(appointmentsFile, appointments);

  res.redirect("/manage");
});

app.get("/reschedule/:id", (req, res) => {
  const { id } = req.params;
  const appointments = readJSON(appointmentsFile);
  const appointment = appointments.find((appt) => appt.id === parseInt(id));

  if (!appointment) {
    return res.send("Appointment not found.");
  }

  res.render("reschedule", { appointment });
});

app.post("/reschedule", (req, res) => {
  const { id, date, time } = req.body;
  const appointments = readJSON(appointmentsFile);

  const index = appointments.findIndex((appt) => appt.id === parseInt(id));
  if (index === -1) {
    return res.send("Appointment not found.");
  }

  // Update the appointment details
  appointments[index].date = date;
  appointments[index].time = time;
  writeJSON(appointmentsFile, appointments);

  res.redirect("/manage");
});

// Logout
app.get("/logout", (req, res) => {
  currentUser = null; // Clear the current user session
  otp = null; // Clear the OTP if any
  res.redirect("/login"); // Redirect to login page
});

// Login page (Updated to include a logout button when logged in)
app.get("/login", (req, res) => {
  if (currentUser) {
    return res.redirect("/schedule"); // Redirect to schedule if already logged in
  }
  res.render("login");
});

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
