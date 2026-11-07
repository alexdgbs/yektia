import LoadingSkeleton from "../LoadingSkeleton";
import { useEffect, useState } from "react";
import { accountApi } from "../../services/accountApi";
import { formatDuration } from "../doctors/doctorPresentation";
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
          ranges: [saved[0] || DEFAULT_SCHEDULE_RANGE],
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
  const range = schedule.ranges[0];
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
          Define tu rango habitual. Las horas disponibles se generan
          automáticamente.
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
            {[15, 30, 45, 60, 90].map((value) => (
              <option key={value} value={value}>
                {formatDuration(value)}
              </option>
            ))}
          </select>
        </label>
        <div className="schedule-rules">
          <div className="schedule-rule">
            <label>
              De
              <select
                value={range.from}
                onChange={(event) => updateRange(0, "from", event.target.value)}
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
                value={range.to}
                onChange={(event) => updateRange(0, "to", event.target.value)}
              >
                {DAYS.slice(dayPosition(range.from)).map((day) => (
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
                value={range.start}
                onChange={(event) =>
                  updateRange(0, "start", event.target.value)
                }
              />
            </label>
            <label>
              Cierra
              <input
                type="time"
                value={range.end}
                onChange={(event) => updateRange(0, "end", event.target.value)}
              />
            </label>
          </div>
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
        <button className="primary-button" disabled={busy}>
          {busy ? "Guardando…" : "Guardar agenda"}
        </button>
        {message && <small role="status">{message}</small>}
      </form>
    </section>
  );
}
