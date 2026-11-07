import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import LoadingSkeleton from "../LoadingSkeleton";
import { accountApi } from "../../services/accountApi";
import { SOCKET_URL } from "../../services/apiConfig";
import { connectPublicSocket } from "../../services/socketClient";
import { formatDuration } from "../doctors/doctorPresentation";

import {
  WEEKDAYS,
  dateFromKey,
  dateKeyAtOffset,
  formatDateKey,
  formatDayTitle,
  formatMonthTitle,
  formatSlotAtOffset,
  formatTimeAtOffset,
  getMonthCells,
  monthForDay,
  monthIndex,
  shiftMonth,
} from "../../utils/dates";
import { MEXICO_CITY_OFFSET_MINUTES } from "../../utils/constants";

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
      : MEXICO_CITY_OFFSET_MINUTES;

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
        {`${formatDuration(doctor.appointmentDuration || 45)} por consulta · Horario local del consultorio`}
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
