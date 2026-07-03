// Validaciones de formularios compartidas por los flujos de autenticación y
// cuenta. Mantienen los mensajes en español y una sola fuente de verdad para
// las reglas (formato de correo, longitud mínima de contraseña, coincidencia).

// Longitud mínima de contraseña: coincide con minimum_password_length del auth
// de Supabase (config.toml) para que la validación de cliente no prometa algo
// que el backend rechazaría.
export const MIN_PASSWORD_LENGTH = 8

// Regex intencionalmente simple: algo@algo.dominio. La verificación real la hace
// el envío del correo; esto solo evita errores obvios antes de llamar a la API.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_REGEX.test((value ?? '').trim())
}

/**
 * Valida una contraseña nueva y su confirmación. Devuelve un mensaje de error en
 * español o null si es válida.
 */
export function validateNewPassword(password, confirmation) {
  if ((password ?? '').length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (password !== confirmation) {
    return 'Las contraseñas no coinciden.'
  }
  return null
}
