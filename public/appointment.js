// @ts-nocheck
document
  .getElementById("appointment-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault(); // Empêche le rechargement de la page

    const phone = document.getElementById("phone").value;
    const date = new Date(document.getElementById("date").value);
    const reminderTime = parseInt(
      document.getElementById("reminderTime").value
    );
    const message = document.getElementById("message").value;

    // Calculer la nouvelle date pour le rappel
    const reminderDate = new Date(date.getTime() - reminderTime * 60 * 1000);

    // Préparer les données à envoyer
    const reminderData = {
      phone: phone,
      date: reminderDate.toISOString(), // Convertir en format ISO
      message: message,
    };

    try {
      const response = await fetch("http://localhost:3000/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      });

      const result = await response.json();
      document.getElementById("result").innerText = result.message;
    } catch (error) {
      document.getElementById("result").innerText =
        "Erreur lors de la planification du rappel.";
    }
  });
