export const ADMIN_DIALOGS = {
  discard: {
    eyebrow: "Acción permanente",
    title: "¿Eliminar este borrador?",
    text: "Se borrarán de la base de datos todos los datos de la solicitud y cada archivo adjunto. No podrás recuperarlos.",
    cancel: "Conservar borrador",
    confirm: "Sí, eliminar todo",
  },
  withdraw: {
    eyebrow: "Baja del directorio",
    title: "Retirar perfil",
    text: "El perfil dejará de ser público y sus citas futuras serán canceladas.",
    label: "Motivo que recibirá el profesional",
    initial: "Perfil retirado del directorio a solicitud del profesional.",
    confirm: "Retirar perfil",
  },
  erase: {
    eyebrow: "Acción irreversible",
    title: "Eliminar datos profesionales",
    text: "Se eliminarán documentos, cédulas, contacto, descripción, valoraciones y comentarios. Las citas conservarán una referencia anónima.",
    label: "Escribe ELIMINAR para confirmar",
    initial: "",
    confirm: "Eliminar datos",
  },
  remove: {
    eyebrow: "Eliminar solicitud",
    title: "Borrar solicitud rechazada",
    text: "Se borrarán la solicitud, sus documentos privados y todo su historial. Esta acción no se puede deshacer.",
    confirm: "Eliminar definitivamente",
  },
};
