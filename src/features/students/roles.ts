/** Roles que pueden consultar alumnos. Cada rol ve solo lo que la API le devuelve. */
export const STUDENT_VIEW_ROLES = [
  'director',
  'administrador',
  'coordinacion',
  'tesoreria',
  'docente',
  'auxiliar',
]

/** Roles que pueden registrar y editar alumnos, sus apoderados y su foto. */
export const STUDENT_WRITE_ROLES = ['director', 'administrador']
