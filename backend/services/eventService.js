/**
 * File: eventService.js
 * Purpose: Event management business logic (legacy in-memory service)
 * Description: Legacy service class with in-memory event storage.
 *              NOTE: Deprecated - use eventRepository directly instead.
 *              Current code uses database-backed eventRepository.
 */

class EventService {
  constructor() {
    this.events = [
      {
        id: 1,
        title: 'Tech Conference 2026',
        description: 'Annual technology conference for innovators',
        date: '2026-04-15',
        time: '09:00 AM',
        location: 'Convention Center',
        capacity: 500,
        registrations: 234,
        status: 'ongoing',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        title: 'AI Workshop',
        description: 'Hands-on workshop for AI and Machine Learning',
        date: '2026-05-20',
        time: '02:00 PM',
        location: 'Tech Hub',
        capacity: 50,
        registrations: 45,
        status: 'upcoming',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        title: 'Web Development Bootcamp',
        description: 'Intensive bootcamp for web developers',
        date: '2026-06-01',
        time: '10:00 AM',
        location: 'Online',
        capacity: 100,
        registrations: 87,
        status: 'upcoming',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  list() {
    return this.events;
  }

  getById(id) {
    return this.events.find((e) => e.id === Number(id)) || null;
  }

  create(payload) {
    const { title, description, date, time, location, capacity } = payload;
    const event = {
      id: Math.max(...this.events.map((e) => e.id), 0) + 1,
      title,
      description,
      date,
      time,
      location,
      capacity: Number(capacity),
      registrations: 0,
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.events.push(event);
    return event;
  }

  update(id, payload) {
    const eventIndex = this.events.findIndex((e) => e.id === Number(id));
    if (eventIndex === -1) return null;

    const fields = ['title', 'description', 'date', 'time', 'location', 'status'];
    fields.forEach((field) => {
      if (payload[field]) this.events[eventIndex][field] = payload[field];
    });
    if (payload.capacity) this.events[eventIndex].capacity = Number(payload.capacity);
    this.events[eventIndex].updatedAt = new Date();
    return this.events[eventIndex];
  }

  remove(id) {
    const eventIndex = this.events.findIndex((e) => e.id === Number(id));
    if (eventIndex === -1) return null;
    const deleted = this.events.splice(eventIndex, 1);
    return deleted[0];
  }
}

module.exports = EventService;

