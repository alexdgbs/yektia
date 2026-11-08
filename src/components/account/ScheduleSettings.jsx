import LoadingSkeleton from "../LoadingSkeleton";
import { useEffect, useState } from "react";
import { accountApi } from "../../services/accountApi";
import { formatDuration } from "../doctors/doctorPresentation";
import { APPOINTMENT_DURATIONS } from "../../../shared/index.js";
const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];
const DEFAULT_SCHEDULE_RANGE = { from: 1, to: 5, start: "09:00", end: "14:00" };
const dayPosition = (day) => DAYS.findIndex((item) => item.value === day);
const rulesToRanges = (rules = []) => {
  const sorted = [...rules].sort(
    (a, b) => dayPosition(a.day) - dayPosition(b.day),
  );
  const ranges = [];
  for (const rule of sorted) {
    const previous = ranges.at(-1);
    if (
      previous &&
      previous.start === rule.start &&
      previous.end === rule.end &&
      dayPosition(rule.day) === dayPosition(previous.to) + 1
    )
      previous.to = rule.day;
    else
      ranges.push({
        from: rule.day,
        to: rule.day,
        start: rule.start,
        end: rule.end,
      });
  }
  return ranges;
};
const rangesToRules = (ranges) =>
  ranges.flatMap((range) => {
    const from = dayPosition(range.from);
    const to = dayPosition(range.to);
    if (from < 0 || to < from) return [];
    return DAYS.slice(from, to + 1).map((day) => ({
      day: day.value,
      start: range.start,
      end: range.end,
    }));
  });
export default function ScheduleSettings() {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState({
    duration: 45,
    timezoneOffset: -new Date().getTimezoneOffset(),
    ranges: [DEFAULT_SCHEDULE_RANGE],
    blockedDates: [],
  });
  const [blockedDate, setBlockedDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    accountApi
      .mySchedule()
      .then((result) => {
        const saved = rulesToRanges(result.rules);
        setSchedule({
          ...result,
          ranges: saved.length ? saved : [DEFAULT_SCHEDULE_RANGE],
        });
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);
  const updateRange = (index, field, value) =>
    setSchedule((current) => ({
      ...current,
      ranges: current.ranges.map((range, position) => {
        if (position !== index) return range;
        const next = {
          ...range,
          [field]: ["from", "to"].includes(field) ? Number(value) : value,
        };
        if (field === "from" && dayPosition(next.to) < dayPosition(next.from))
          next.to = next.from;
        return next;
      }),
    }));
  const addRange = () => {
    const last = schedule.ranges.at(-1) || DEFAULT_SCHEDULE_RANGE;
    setSchedule((current) => ({
      ...current,
      ranges: [
        ...current.ranges,
        { from: 1, to: 1, start: last.start, end: last.end },
      ],
    }));
  };
  const removeRange = (index) =>
    setSchedule((current) => ({
      ...current,
      ranges:
        current.ranges.length > 1
          ? current.ranges.filter((_, position) => position !== index)
          : current.ranges,
    }));
  const addBlockedDate = () => {
    if (!blockedDate || schedule.blockedDates.includes(blockedDate)) return;
    setSchedule((current) => ({
      ...current,
      blockedDates: [...current.blockedDates, blockedDate].sort(),
    }));
    setBlockedDate("");
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await accountApi.updateSchedule({
        duration: schedule.duration,
        blockedDates: schedule.blockedDates,
        rules: rangesToRules(schedule.ranges),
        timezoneOffset: -new Date().getTimezoneOffset(),
      });
      setSchedule({ ...result, ranges: rulesToRanges(result.rules) });
      setMessage("Agenda actualizada.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <LoadingSkeleton variant="schedule" label="Cargando agenda médica" />
    );
  return (
    <section className="settings-panel schedule-settings">
      <header>
        <span className="eyebrow">Agenda</span>
        <h2>Horario semanal</h2>
        <p>
          Define tus rangos habituales; añade uno por cada horario distinto. Las
          horas disponibles se generan automáticamente.
        </p>
      </header>
      <form onSubmit={save}>
        <label className="duration-field">
          Duración de consulta
          <select
            value={schedule.duration}
            onChange={(event) =>
              setSchedule({ ...schedule, duration: Number(event.target.value) })
            }
          >
            {APPOINTMENT_DURATIONS.map((value) => (
              <option key={value} value={value}>
                {formatDuration(value)}
              </option>
            ))}
          </select>
        </label>
        <div className="schedule-rules">
          {schedule.ranges.map((item, index) => (
            <div
              className="schedule-rule"
              key={index}
              role="group"
              aria-label={`Rango ${index + 1} de ${schedule.ranges.length}`}
            >
              <label>
                De
                <select
                  value={item.from}
                  aria-label={`Día inicial del rango ${index + 1}`}
                  onChange={(event) =>
                    updateRange(index, "from", event.target.value)
                  }
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                A
                <select
                  value={item.to}
                  aria-label={`Día final del rango ${index + 1}`}
                  onChange={(event) =>
                    updateRange(index, "to", event.target.value)
                  }
                >
                  {DAYS.slice(dayPosition(item.from)).map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Abre
                <input
                  type="time"
                  value={item.start}
                  aria-label={`Hora de apertura del rango ${index + 1}`}
                  onChange={(event) =>
                    updateRange(index, "start", event.target.value)
                  }
                />
              </label>
              <label>
                Cierra
                <input
                  type="time"
                  value={item.end}
                  aria-label={`Hora de cierre del rango ${index + 1}`}
                  onChange={(event) =>
                    updateRange(index, "end", event.target.value)
                  }
                />
              </label>
              {schedule.ranges.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  aria-label={`Quitar rango ${index + 1}`}
                >
                  Quitar rango
                </button>
              )}
            </div>
          ))}
        </div>
        <div>
          <button type="button" className="secondary-button" onClick={addRange}>
            Añadir rango
          </button>
        </div>
        <div className="blocked-dates">
          <h3>Excepciones</h3>
          <p>
            Bloquea únicamente fechas en las que no atenderás, como vacaciones o
            días festivos.
          </p>
          <div>
            <input
              aria-label="Fecha no disponible"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={blockedDate}
              onChange={(event) => setBlockedDate(event.target.value)}
            />
            <button type="button" onClick={addBlockedDate}>
              Bloquear fecha
            </button>
          </div>
          {schedule.blockedDates.length > 0 && (
            <ul>
              {schedule.blockedDates.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSchedule((current) => ({
                        ...current,
                        blockedDates: current.blockedDates.filter(
                          (dateItem) => dateItem !== item,
                        ),
                      }))
                    }
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar agenda"}
        </button>
        {message && <small role="status">{message}</small>}
      </form>
    </section>
  );
}
