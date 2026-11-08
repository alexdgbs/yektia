import { useCallback, useEffect, useState } from "react";
import { doctorsApi } from "../services/doctorsApi";
import { usePublicSocket } from "./useSocket";
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

  // Un 400 es un id con formato inválido: el perfil no existe, igual que
  // un 404. Solo otros errores (sin red, API caída) se propagan como fallo
  // de carga, para no decir "error de conexión" cuando no lo es.
  const getDoctor = useCallback(async (doctorId) => {
    let data;
    try {
      data = await doctorsApi.get(doctorId);
    } catch (error) {
      if (error?.status === 404 || error?.status === 400) return null;
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
        doctor._id === medicoId ? { ...doctor, promedio, ratingCount } : doctor,
      ),
    );

  usePublicSocket(
    {
      nuevo_comentario: onComment,
      comentario_eliminado: onCommentDeleted,
      nueva_valoracion: onRating,
      perfil_actualizado: ({ medico }) =>
        setDoctors((current) =>
          current.map((doctor) =>
            doctor._id === medico._id ? normalizeDoctor(medico) : doctor,
          ),
        ),
      perfil_retirado: ({ medicoId }) =>
        setDoctors((current) =>
          current.filter((doctor) => doctor._id !== medicoId),
        ),
    },
    [],
  );

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
