import {
  buildAndroidIntentUrl,
  buildAppCallbackUrl,
  clearUrlFragment,
  parseTokenHashFragment,
  verifyTokenHash,
} from "/assets/paiddue-auth.js";

const button = document.querySelector("#continue");
const heading = document.querySelector("#heading");
const intro = document.querySelector("#intro");
const status = document.querySelector("#status");
const callback = parseTokenHashFragment(window.location.hash);
let verifiedDestination = null;

// Keep the one-time token out of the address bar/history while retaining it only in memory.
clearUrlFragment();

function showInvalidLink() {
  heading.textContent = "This link cannot be used";
  intro.textContent = "The link is missing information, has expired, or has already been used. Request a new email from Paid&Due and try again.";
  button.hidden = true;
  status.textContent = "No verification was attempted.";
  status.dataset.kind = "error";
}

if (!callback) {
  showInvalidLink();
} else {
  heading.textContent = callback.type === "recovery" ? "Reset your Paid&Due password" : "Verify your email address";
  intro.textContent = callback.type === "recovery"
    ? "Press Continue to securely validate this one-time link. You will then choose Open Paid&Due to launch the app, or use the browser fallback if the app is not installed."
    : "Press Verify email to securely validate this one-time link.";
  button.textContent = callback.type === "recovery" ? "Continue to password reset" : "Verify email and continue";
  button.disabled = false;
}

button.addEventListener("click", async () => {
  if (!callback || button.disabled) return;

  // A second, direct user click explicitly targets the installed Android package.
  // If the app is absent, Chrome opens the same verified callback in the browser fallback.
  if (verifiedDestination) {
    window.location.assign(buildAndroidIntentUrl(verifiedDestination));
    return;
  }

  button.disabled = true;
  button.textContent = "Verifying…";
  status.textContent = "";
  try {
    const session = await verifyTokenHash(callback.tokenHash, callback.type);
    verifiedDestination = buildAppCallbackUrl(session, callback.type);
    heading.textContent = "Your link is verified";
    intro.textContent = callback.type === "recovery"
      ? "Your one-time link is valid. Tap Open Paid&Due to launch the app. If it is not installed, you can finish resetting your password in this browser."
      : "Your email address is confirmed. Tap Continue to Paid&Due to open the app.";
    button.textContent = callback.type === "recovery" ? "Open Paid&Due" : "Continue to Paid&Due";
    button.disabled = false;
    status.textContent = "Verification successful.";
    status.dataset.kind = "success";
  } catch {
    heading.textContent = "This link is invalid or expired";
    intro.textContent = "The one-time link could not be verified. Request a new email from Paid&Due and use the newest link.";
    button.hidden = true;
    status.textContent = "For your security, the link was not retried.";
    status.dataset.kind = "error";
  }
});
