export const MESSAGE_LIMIT = 4000;
export function messageText(value) {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Escreva uma mensagem antes de enviar.");
  const text = value.trim();
  if (text.length > MESSAGE_LIMIT)
    throw new Error(`Use até ${MESSAGE_LIMIT} caracteres por mensagem.`);
  return text;
}
export function sameMessage(message, text, senderId, role) {
  return (
    message.text === text &&
    message.sender_id === senderId &&
    message.sender_role === role
  );
}
