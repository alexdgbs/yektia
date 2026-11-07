import { useCallback, useEffect, useState } from "react";
import { doctorsApi } from "../services/doctorsApi";
import { SOCKET_URL } from "../services/apiConfig";
import { connectPublicSocket } from "../services/socketClient";
import { doctorRating } from "../components/doctors/doctorPresentation";

const normalizeDoctor = (doctor) => {
  const { count, average } = doctorRating(doctor);
  return { ...doctor, ratingCount: count, promedio: average };
};

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // El directorio completo se carga una vez; los filtros se aplican en el
  // cliente, así la lista de especialidades y el total no cambian al filtrar.
  const loadDoctors = useCallback(async () => {
    try {
      const data = await doctorsApi.list();
      setDoctors(Array.isArray(data) ? data.map(normalizeDoctor) : []);
      setError("");
    } catch (requestError) {
      setDoctors([]);
      setError(
        requestError?.code === "API_NOT_CONFIGURED"
          ? requestError.message
          : "No fue posible cargar el directorio.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Solo un 404 significa que el perfil no existe; cualquier otro error
  // (sin red, API caída) se propaga para mostrar el estado de error.
  const getDoctor = useCallback(async (doctorId) => {
    let data;
    try {
      data = await doctorsApi.get(doctorId);
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
    if (!data?._id) return null;
    const normalized = normalizeDoctor(data);
    setDoctors((current) =>
      current.some((doctor) => doctor._id === normalized._id)
        ? current.map((doctor) =>
            doctor._id === normalized._id ? normalized : doctor,
          )
        : [...current, normalized],
    );
    return normalized;
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
    getDoctor,
    rateDoctor,
    addComment,
    updateComment,
    deleteComment,
  };
}
