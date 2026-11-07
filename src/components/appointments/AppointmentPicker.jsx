import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import LoadingSkeleton from "../LoadingSkeleton";
import { accountApi } from "../../services/accountApi";
import { SOCKET_URL } from "../../services/apiConfig";
import { connectPublicSocket } from "../../services/socketClient";

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const DEFAULT_TIMEZONE_OFFSET = -360;
const utcFormatter = (options) =>
  new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "UTC" });
const dateFromKey = (key) => new Date(`${key}T00:00:00.000Z`);
const dateKeyAtOffset = (value, offset) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + offset * 60_000).toISOString().slice(0, 10);
};
const monthForDay = (key) => key.slice(0, 7);
const monthIndex = (key) => {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + month - 1;
};
const shiftMonth = (key, amount) => {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
};
const formatDateKey = (key, options) =>
  utcFormatter(options).format(dateFromKey(key));
const capitalizeFirst = (value) =>
  value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1);
const formatMonthTitle = (month) =>
  capitalizeFirst(
    formatDateKey(`${month}-01`, { month: "long", year: "numeric" }),
  );
const formatDayTitle = (day) =>
  capitalizeFirst(
    formatDateKey(day, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
const formatTimeAtOffset = (value, offset) => {
  const shifted = new Date(new Date(value).getTime() + offset * 60_000);
  return utcFormatter({ hour: "2-digit", minute: "2-digit" }).format(shifted);
};
const formatSlotAtOffset = (value, offset) => {
  const shifted = new Date(new Date(value).getTime() + offset * 60_000);
  return utcFormatter({
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(shifted);
};
const getMonthCells = (month) => {
  const firstDay = dateFromKey(`${month}-01`);
  const year = firstDay.getUTCFullYear();
  const monthNumber = firstDay.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: leadingDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
};

export default function AppointmentPicker({ doctor, auth, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selected, setSelected] = useState("");
  const [viewMonth, setViewMonth] = useState("");
  const [monthPanelCount, setMonthPanelCount] = useState(() =>
    window.matchMedia?.("(max-width: 620px)").matches ? 1 : 2,
  );
  const [status, setStatus] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const timezoneOffset =
    doctor.timezoneOffset != null &&
    Number.isInteger(Number(doctor.timezoneOffset))
      ? Number(doctor.timezoneOffset)
      : DEFAULT_TIMEZONE_OFFSET;

  useEffect(() => {
    const narrowViewport = window.matchMedia("(max-width: 620px)");
    const updatePanelCount = () =>
      setMonthPanelCount(narrowViewport.matches ? 1 : 2);
    narrowViewport.addEventListener("change", updatePanelCount);
    return () => narrowViewport.removeEventListener("change", updatePanelCount);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await accountApi.slots(doctor._id);
        if (!active) return;
        setSlots(Array.isArray(result) ? result : []);
        setAvailabilityError("");
      } catch (error) {
        if (active) {
          setAvailabilityError(
            error?.message || "No fue posible cargar la agenda.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    if (!SOCKET_URL) {
      return () => {
        active = false;
      };
    }

    const socket = connectPublicSocket();
    socket.on("agenda_actualizada", ({ doctorId }) => {
      if (doctorId === doctor._id) load();
    });
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [doctor._id]);

  const slotsByDay = useMemo(() => {
    const grouped = new Map();
    for (const slot of slots) {
      const day = dateKeyAtOffset(slot.startsAt, timezoneOffset);
      if (!day) continue;
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day).push(slot);
    }
    return grouped;
  }, [slots, timezoneOffset]);
  const dayKeys = useMemo(() => [...slotsByDay.keys()].sort(), [slotsByDay]);
  const firstAvailableDay =
    dayKeys.find((day) =>
      slotsByDay.get(day)?.some((slot) => slot.status === "open"),
    ) || "";
  const firstCalendarDay = firstAvailableDay || dayKeys[0] || "";
  const lastDay = dayKeys.at(-1) || "";
  const selectedDaySlots = slotsByDay.get(selectedDay) || [];
  const selectedDayHasOpen = selectedDaySlots.some(
    (slot) => slot.status === "open",
  );
  const activeDay = selectedDayHasOpen ? selectedDay : "";
  const maxMonth = lastDay ? monthForDay(lastDay) : "";
  const firstMonth = dayKeys[0] ? monthForDay(dayKeys[0]) : "";
  const activeMonth =
    viewMonth && maxMonth
      ? viewMonth > maxMonth
        ? maxMonth
        : viewMonth
      : firstCalendarDay
        ? monthForDay(firstCalendarDay)
        : "";
  const visibleMonthCount =
    activeMonth && maxMonth
      ? Math.max(
          0,
          Math.min(
            monthPanelCount,
            monthIndex(maxMonth) - monthIndex(activeMonth) + 1,
          ),
        )
      : 0;
  const visibleMonths = Array.from({ length: visibleMonthCount }, (_, index) =>
    shiftMonth(activeMonth, index),
  );
  const hasNextMonth = Boolean(
    activeMonth &&
    maxMonth &&
    monthIndex(activeMonth) + monthPanelCount <= monthIndex(maxMonth),
  );
  const selectedSlotIsAvailable = selectedDaySlots.some(
    (slot) => slot._id === selected && slot.status === "open",
  );
  const activeSlot = selectedSlotIsAvailable ? selected : "";
  const canRequestAppointment =
    auth.user?.role !== "admin" &&
    String(auth.user?.doctorId || "") !== String(doctor._id);

  const requestAppointment = async () => {
    if (!auth.user) {
      onNavigate?.("/cuenta");
      return;
    }
    if (auth.user.role === "admin") {
      setStatus("La cuenta administrativa no puede solicitar citas.");
      return;
    }
    if (String(auth.user.doctorId || "") === String(doctor._id)) {
      setStatus("No puedes agendar una cita contigo mismo.");
      return;
    }
    const chosenSlot = selectedDaySlots.find(
      (slot) => slot._id === selected && slot.status === "open",
    );
    if (!chosenSlot) {
      setStatus("Selecciona un horario disponible.");
      return;
    }

    try {
      await accountApi.createAppointment({ slotId: selected });
      setSlots((current) =>
        current.map((slot) =>
          slot._id === selected ? { ...slot, status: "booked" } : slot,
        ),
      );
      setSelected("");
      setStatus("Solicitud enviada. El médico debe confirmarla.");
    } catch (error) {
      setStatus(error?.message || "No fue posible solicitar la cita.");
    }
  };

  return (
    <div className="appointment-picker">
      <span className="appointment-picker__duration">
        {doctor.appointmentDuration || 45} minutos por consulta · Horario local
        del consultorio
      </span>

      {loading ? (
        <LoadingSkeleton
          variant="slots"
          label="Cargando horarios disponibles"
        />
      ) : availabilityError && !slots.length ? (
        <p className="appointment-message" role="alert">
          {availabilityError}
        </p>
      ) : slots.length ? (
        <>
          {activeDay ? (
            <section
              className="selected-date"
              aria-label="Horarios disponibles"
            >
              <header className="selected-date__heading">
                <button
                  className="appointment-back"
                  type="button"
                  onClick={() => {
                    setSelectedDay("");
                    setSelected("");
                    setStatus("");
                  }}
                >
                  <FiChevronLeft aria-hidden="true" />
                  Calendario
                </button>
                <div className="selected-date__date">
                  <span className="eyebrow">Horarios disponibles</span>
                  <strong>{formatDayTitle(activeDay)}</strong>
                </div>
                <span className="slot-legend">
                  <span>
                    <i /> Disponible
                  </span>
                  {selectedDaySlots.some((slot) => slot.status !== "open") && (
                    <span>
                      <i className="is-occupied" /> Ocupado
                    </span>
                  )}
                </span>
              </header>
              <div className="slot-list">
                {selectedDaySlots.map((slot) => {
                  const occupied = slot.status !== "open";
                  return (
                    <button
                      type="button"
                      disabled={occupied}
                      className={`${activeSlot === slot._id ? "active" : ""} ${occupied ? "occupied" : ""}`}
                      key={slot._id}
                      onClick={() => {
                        setSelected(slot._id);
                        setStatus("");
                      }}
                      aria-pressed={activeSlot === slot._id}
                      aria-label={`${formatSlotAtOffset(slot.startsAt, timezoneOffset)}${occupied ? ", ocupado" : ", disponible"}`}
                    >
                      {formatTimeAtOffset(slot.startsAt, timezoneOffset)}
                    </button>
                  );
                })}
              </div>
              {canRequestAppointment ? (
                <div className="appointment-picker__actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={requestAppointment}
                    disabled={!activeSlot}
                  >
                    {auth.user
                      ? "Solicitar cita"
                      : "Inicia sesión para agendar"}
                  </button>
                  {!activeSlot && (
                    <small>Elige un horario para continuar.</small>
                  )}
                </div>
              ) : (
                <p className="appointment-message">
                  La cuenta administrativa no puede solicitar citas.
                </p>
              )}
            </section>
          ) : (
            <section
              className="appointment-calendar"
              aria-label="Selecciona una fecha"
            >
              <div className="appointment-calendar__toolbar">
                <div>
                  <span className="eyebrow">Disponibilidad</span>
                  <h3>Elige un día</h3>
                </div>
                <div className="appointment-calendar__navigation">
                  <button
                    type="button"
                    onClick={() => setViewMonth(shiftMonth(activeMonth, -1))}
                    disabled={
                      !activeMonth || !firstMonth || activeMonth <= firstMonth
                    }
                    aria-label="Ver meses anteriores"
                  >
                    <FiChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(shiftMonth(activeMonth, 1))}
                    disabled={!hasNextMonth}
                    aria-label="Ver meses siguientes"
                  >
                    <FiChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div
                className={`appointment-calendar__months ${visibleMonths.length === 1 ? "is-single" : ""}`}
              >
                {visibleMonths.map((month) => (
                  <section
                    className="appointment-month"
                    key={month}
                    aria-label={formatDateKey(`${month}-01`, {
                      month: "long",
                      year: "numeric",
                    })}
                  >
                    <h4>{formatMonthTitle(month)}</h4>
                    <div
                      className="appointment-month__weekdays"
                      aria-hidden="true"
                    >
                      {WEEKDAYS.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                      ))}
                    </div>
                    <div className="appointment-month__days">
                      {getMonthCells(month).map((day, index) => {
                        if (!day) {
                          return (
                            <span
                              className="appointment-day-empty"
                              key={`${month}-empty-${index}`}
                              aria-hidden="true"
                            />
                          );
                        }
                        const daySlots = slotsByDay.get(day) || [];
                        const openCount = daySlots.filter(
                          (slot) => slot.status === "open",
                        ).length;
                        const isSelected = day === activeDay;
                        const isFull = daySlots.length > 0 && openCount === 0;
                        return (
                          <button
                            className={`appointment-day ${openCount ? "is-available" : ""} ${isFull ? "is-full" : ""} ${isSelected ? "is-selected" : ""}`}
                            type="button"
                            key={day}
                            disabled={!openCount}
                            aria-pressed={isSelected}
                            aria-label={`${formatDateKey(day, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}${openCount ? `, ${openCount} ${openCount === 1 ? "horario disponible" : "horarios disponibles"}` : isFull ? ", completo" : ", sin horarios publicados"}`}
                            onClick={() => {
                              setSelectedDay(day);
                              setSelected("");
                              setStatus("");
                            }}
                          >
                            <strong>{dateFromKey(day).getUTCDate()}</strong>
                            <small>
                              {openCount
                                ? `${openCount} ${openCount === 1 ? "horario" : "horarios"}`
                                : isFull
                                  ? "Completo"
                                  : ""}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <div className="appointment-calendar__legend">
                <span>
                  <i className="is-available" /> Disponible
                </span>
                <span>
                  <i className="is-full" /> Completo
                </span>
              </div>
            </section>
          )}
          {availabilityError && (
            <p className="appointment-message" role="status">
              {availabilityError}
            </p>
          )}
        </>
      ) : (
        <p className="appointment-message">
          No hay horarios publicados por ahora.
        </p>
      )}
      {status && (
        <small className="appointment-picker__status" role="status">
          {status}
        </small>
      )}
    </div>
  );
}
