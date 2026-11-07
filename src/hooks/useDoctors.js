import { useCallback, useEffect, useState } from "react";
import { doctorsApi } from "../services/doctorsApi";
import { SOCKET_URL } from "../services/apiConfig";
import { connectPublicSocket } from "../services/socketClient";

const normalizeDoctor = (doctor) => {
  const ratingCount = Math.max(0, Number(doctor.ratingCount) || 0);
  return {
    ...doctor,
    ratingCount,
    promedio: ratingCount ? Number(doctor.promedio) || 0 : 0,
  };
};

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    doctorsApi
      .list()
      .then((data) => {
        if (active) {
          setDoctors(Array.isArray(data) ? data.map(normalizeDoctor) : []);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setDoctors([]);
          setError(
            requestError?.code === "API_NOT_CONFIGURED"
              ? requestError.message
              : "No fue posible cargar el directorio.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!SOCKET_URL) return undefined;
    const socket = connectPublicSocket();
    const onComment = ({ medicoId, comentario }) =>
      setDoctors((current) =>
        current.map((doctor) => {
          if (doctor._id !== medicoId) return doctor;
          const previous = (doctor.comentarios || []).find(
            (item) => item._id === comentario._id,
          );
          return {
            ...doctor,
            comentarios: [
              ...(doctor.comentarios || []).filter(
                (item) => item._id !== comentario._id,
              ),
              { ...comentario, isMine: previous?.isMine || false },
            ],
          };
        }),
      );
    const onCommentDeleted = ({ medicoId, comentarioId }) =>
      setDoctors((current) =>
        current.map((doctor) =>
          doctor._id === medicoId
            ? {
                ...doctor,
                comentarios: (doctor.comentarios || []).filter(
                  (item) => item._id !== comentarioId,
                ),
              }
            : doctor,
        ),
      );
    const onRating = ({ medicoId, promedio, ratingCount }) =>
      setDoctors((current) =>
        current.map((doctor) =>
          doctor._id === medicoId
            ? { ...doctor, promedio, ratingCount }
            : doctor,
        ),
      );
    socket.on("nuevo_comentario", onComment);
    socket.on("comentario_eliminado", onCommentDeleted);
    socket.on("nueva_valoracion", onRating);
    socket.on("perfil_actualizado", ({ medico }) =>
      setDoctors((current) =>
        current.map((doctor) =>
          doctor._id === medico._id ? normalizeDoctor(medico) : doctor,
        ),
      ),
    );
    socket.on("perfil_retirado", ({ medicoId }) =>
      setDoctors((current) =>
        current.filter((doctor) => doctor._id !== medicoId),
      ),
    );
    return () => socket.disconnect();
  }, []);

  const rateDoctor = useCallback(async (doctorId, stars) => {
    const result =
      stars === 0
        ? await doctorsApi.removeRating(doctorId)
        : await doctorsApi.rate(doctorId, { estrellas: stars });
    setDoctors((current) =>
      current.map((doctor) =>
        doctor._id === doctorId
          ? {
              ...doctor,
              promedio: result.promedio,
              ratingCount: result.ratingCount,
              myRating: stars,
            }
          : doctor,
      ),
    );
  }, []);

  const addComment = useCallback(async (doctorId, texto) => {
    const result = await doctorsApi.comment(doctorId, { texto });
    setDoctors((current) =>
      current.map((doctor) =>
        doctor._id === doctorId
          ? {
              ...doctor,
              comentarios: [
                ...(doctor.comentarios || []).filter(
                  (item) => item._id !== result.comentario._id,
                ),
                result.comentario,
              ],
            }
          : doctor,
      ),
    );
  }, []);

  const updateComment = useCallback(async (doctorId, commentId, texto) => {
    const result = await doctorsApi.updateComment(doctorId, commentId, {
      texto,
    });
    setDoctors((current) =>
      current.map((doctor) =>
        doctor._id === doctorId
          ? {
              ...doctor,
              comentarios: (doctor.comentarios || []).map((item) =>
                item._id === commentId ? result.comentario : item,
              ),
            }
          : doctor,
      ),
    );
  }, []);

  const deleteComment = useCallback(async (doctorId, commentId) => {
    await doctorsApi.deleteComment(doctorId, commentId);
    setDoctors((current) =>
      current.map((doctor) =>
        doctor._id === doctorId
          ? {
              ...doctor,
              comentarios: (doctor.comentarios || []).filter(
                (item) => item._id !== commentId,
              ),
            }
          : doctor,
      ),
    );
  }, []);

  return {
    doctors,
    loading,
    error,
    rateDoctor,
    addComment,
    updateComment,
    deleteComment,
  };
}
