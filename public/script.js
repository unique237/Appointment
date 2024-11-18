// Fonction pour enregistrer un utilisateur
async function register() {
  const phone = document.getElementById("phone").value;

  try {
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) {
      throw new Error(
        "Erreur lors de l'enregistrement : " + (await res.text())
      );
    }

    alert(await res.text());
  } catch (error) {
    alert(error.message);
  }
}

// Fonction pour vérifier l'OTP
async function verify() {
  const phone = document.getElementById("phone").value;
  const otp = document.getElementById("otp").value;

  const res = await fetch("http://localhost:3000/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  if (res.ok) {
    alert("OTP vérifié avec succès !");
    window.location.href = "appointments.html"; // Redirection vers la gestion des rendez-vous
  } else {
    alert(await res.text());
  }
}

async function loadReminders() {
  const tableBody = document
    .getElementById("reminders-table")
    .querySelector("tbody");
  tableBody.innerHTML = ""; // Réinitialiser le tableau

  try {
    const res = await fetch("http://localhost:3000/reminders");

    // Vérification de la réponse
    if (!res.ok) {
      throw new Error(`Erreur HTTP : ${res.status}`);
    }

    const reminders = await res.json();

    // Vérification si la liste des rappels est vide
    if (reminders.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4" class="text-center">Aucun rappel planifié</td>`;
      tableBody.appendChild(row);
      return;
    }

    reminders.forEach((reminder) => {
      const row = document.createElement("tr");

      row.innerHTML = `
                <td>${reminder.phone}</td>
                <td>${new Date(reminder.date).toLocaleString()}</td>
                <td>${reminder.message}</td>
                <td>${reminder.status}</td>
            `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Erreur lors du chargement des rappels:", error);
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="text-center text-danger">Erreur lors du chargement des rappels. Veuillez réessayer plus tard.</td>`;
    tableBody.appendChild(row);
  }
}

// Charger les rappels dès le chargement de la page
document.addEventListener("DOMContentLoaded", loadReminders);

// Fonction pour passer un appel
// async function makeCall() {
//   const phone = document.getElementById("phone").value;

//   try {
//     const res = await fetch(`http://localhost:3000/token?phone=${phone}`);

//     if (!res.ok) {
//       throw new Error(
//         "Erreur lors de la récupération du jeton : " + (await res.text())
//       );
//     }

//     const { token } = await res.json();
//     const device = new Twilio.Device();

//     device.setup(token);

//     device.on("ready", () => {
//       device.connect({ to: "+1234567890" }); // Remplacez par le numéro de destination
//     });

//     device.on("error", (error) => {
//       console.error("Erreur du dispositif Twilio : ", error);
//       alert("Erreur lors de la configuration de l'appel.");
//     });
//   } catch (error) {
//     alert(error.message);
//   }
// }
