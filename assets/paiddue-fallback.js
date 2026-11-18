import {
  clearUrlFragment,
  parseSessionFragment,
  updatePassword,
} from "/assets/paiddue-auth.js";

const heading = document.querySelector("#heading");
const intro = document.querySelector("#intro");
const status = document.querySelector("#status");
const form = document.querySelector("#password-form");
const passwordInput = document.querySelector("#password");
const confirmInput = document.querySelector("#confirm-password");
const submitButton = document.querySelector("#save-password");
const session = parseSessionFragment(window.location.hash);

// Session tokens are read once and removed from the visible URL/history immediately.
clearUrlFragment();

if (!session) {
  heading.textContent = "No active confirmation";
  intro.textContent = "This page does not contain an active confirmation. Return to Paid&Due and request a fresh email if you still need to verify your address or reset your password.";
} else if (session.type === "recovery") {
  heading.textContent = "Choose a new password";
  intro.textContent = "Your one-time link was verified. Choose a new password below. It must be at least 8 characters.";
  form.hidden = false;
} else {
  heading.textContent = "Email verified";
  intro.textContent = "Your email address has been confirmed. You can now open Paid&Due and sign in.";
  status.textContent = "Email confirmation successful.";
  status.dataset.kind = "success";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session || session.type !== "recovery" || submitButton.disabled) return;

  const password = passwordInput.value;
  const confirmation = confirmInput.value;
  if (password.length < 8) {
    status.textContent = "Password must be at least 8 characters.";
    status.dataset.kind = "error";
    return;
  }
  if (password !== confirmation) {
    status.textContent = "The passwords do not match.";
    status.dataset.kind = "error";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Saving…";
  status.textContent = "";
  try {
    await updatePassword(session.accessToken, password);
    passwordInput.value = "";
    confirmInput.value = "";
    heading.textContent = "Password updated";
    intro.textContent = "Your Paid&Due password has been changed. You can now open the app and sign in with your new password.";
    status.textContent = "Password reset successful.";
    status.dataset.kind = "success";
    form.hidden = true;
  } catch {
    status.textContent = "Your password could not be updated. Request a new reset email and try again.";
    status.dataset.kind = "error";
    submitButton.disabled = false;
    submitButton.textContent = "Save new password";
  }
});
