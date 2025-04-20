import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Eventdetails.css";

const Eventdetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ticketBooked, setTicketBooked] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          setEvent(data);
        } else {
          console.error("Error fetching event:", data.message);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    const checkTicket = async () => {
      try {
        const res = await fetch(`/api/tickets/${id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setTicketBooked(data.booked);
        }
      } catch (err) {
        console.error('Error checking ticket:', err);
      }
    };

    fetchEvent();
    checkTicket();
  }, [id]);

  // const bufferDecode = (value) => {
  //   const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  //   return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  // };

  const handleBookTicket = async () => {
    setLoading(true);
  
    try {
      const res = await fetch('/api/tickets/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId: id }),
      });
  
      const data = await res.json();
      if (res.ok) {
        setTicketBooked(true);
      } else {
        alert(data.message || 'Failed to book ticket');
      }
    } catch (error) {
      console.error('Error booking ticket:', error);
      alert('Error booking ticket');
    }
    setLoading(false);
  };
  

  if (!event) {
    return <div className="loading">Loading event...</div>;
  }

  return (
    <div className="event-details">
      <div
        className="event-header"
        style={{
          backgroundImage: `url(${event.image2 || event.image1})`, // Use direct image URLs
        }}
      >
        <div className="event-overlay">
          <div className="event-main">
            <div className="event-left">
              <img src={event.image1} alt={event.title} className="event-poster" />
            </div>

            <div className="event-right">
              <h1>{event.title}</h1>
              <div className="event-details-grid">
                <p><strong>📅 Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                <p><strong>🕒 Time:</strong> {event.time}</p>
                <p><strong>📍 Location:</strong> {event.location}</p>
                <p><strong>🏟️ Venue:</strong> {event.venue}</p>
                <p><strong>💸 Price:</strong> ₹{event.price}</p>
                <p><strong>🎶 Genre:</strong> {event.genre}</p>
              </div>
              {ticketBooked ? (
                  <button className="booked-button">Ticket booked!</button>
                ) : (
                  <button className="book-button" onClick={handleBookTicket} disabled={loading}>
                    {loading ? 'Booking...' : 'Book Ticket'}
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="event-about">
        <h2>About the event</h2>
        <p>{event.description || "No description available for this event."}</p>
      </div>
    </div>
  );
};

export default Eventdetails;