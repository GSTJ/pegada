export const maskDate = (input: string): string => {
  const maxLength = 10;
  const dateRegex = new RegExp(/^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/);

  let maskedInput = input
    .replaceAll(/[^\d]/g, "") // Remove any non-digit characters
    .slice(0, 8); // Limit to a maximum of 8 digits

  if (!dateRegex.test(maskedInput)) {
    return ""; // If the input doesn't match the regex, return an empty string
  }

  if (maskedInput.length >= 2) {
    maskedInput = `${maskedInput.slice(0, 2)}/${maskedInput.slice(2)}`;
  }

  if (maskedInput.length >= 5) {
    maskedInput = `${maskedInput.slice(0, 5)}/${maskedInput.slice(5, 9)}`;
  }

  return maskedInput.slice(0, maxLength);
};
