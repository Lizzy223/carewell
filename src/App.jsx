import { useRef } from 'react'
import * as Icons from 'lucide-react'
import Portal from './Portal.jsx'
import { useEffect, useState } from 'react'
import { nav, trust, stats, doctors, services, perks, reviews } from './data.js'

const Icon = ({ name, size = 18 }) => {
  const C = Icons[name] || Icons.Circle
  return <C size={size} strokeWidth={1.8} />
}
// Placeholder photo block — pass `src` to use a real image.
const Photo = ({ src, label, className = '' }) =>
  src ? <img className={`photo ${className}`} src={src} alt={label} />
      : <div className={`photo ph ${className}`} role="img" aria-label={label}><Icons.Image size={28} /></div>

const Header = () => (
  <header className="header">
    <div className="wrap header-in">
      <a className="logo" href="#home"><span className="logo-mark"><Icons.HeartPulse size={18} /></span>
        <span>CareWell<small>Medical Clinic</small></span></a>
      <nav className="nav">{nav.map(n => <a key={n} href={`#${n.toLowerCase().replace(' ', '')}`}>{n}</a>)}<a href="#/portal">Practitioner Portal</a></nav>
      <div className="header-r"><button className="icon-btn" aria-label="Search"><Icons.Search size={16} /></button>
        <a className="btn btn-dark btn-sm" href="#contact"><Icons.CalendarDays size={14} /> Book Appointment</a></div>
    </div>
  </header>
)

const Hero = () => (
  <section id="home" className="hero">
    <div className="wrap hero-in">
      <div>
        <span className="pill">Your health, our priority</span>
        <h1>Trusted Medical Care for a <em>Healthier Tomorrow</em></h1>
        <p>At CareWell Medical Clinic, we provide comprehensive healthcare services with compassion, expertise and modern technology to keep you and your family healthy.</p>
        <div className="row">
          <a className="btn btn-dark" href="#contact"><Icons.CalendarDays size={16} /> Book Appointment</a>
          <button className="btn btn-ghost"><span className="play"><Icons.Play size={12} /></span> Watch Our Video</button>
        </div>
        <ul className="trust">{trust.map((t, i) => <li key={t}><Icon name={['Stethoscope', 'Building2', 'HeartHandshake', 'Headphones'][i]} size={16} />{t}</li>)}</ul>
      </div>
      <div className="hero-art"><div className="blob" />
        <Photo className="hero-photo" label="Doctor in clinic" />
        <div className="chip"><Icons.HeartPulse size={16} /><span>Better Health<br /><b>Brighter Future</b></span></div></div>
    </div>
  </section>
)

const About = () => (
  <section id="aboutus" className="section">
    <div className="wrap about">
      <div className="about-img"><Photo label="Clinic reception" />
        <div className="cap"><small>Clean &amp; modern facilities</small><b>Riverside Main Care Branch</b></div></div>
      <div className="about-txt"><span className="kicker">About Us</span>
        <h2>Medical Clinic</h2>
        <p>We are a full-service medical clinic dedicated to providing high-quality, patient-centered care. Our team of skilled professionals is here to support your health journey at every stage of life.</p>
        <a className="btn btn-dark btn-sm" href="#doctors">Learn More <Icons.ArrowRight size={14} /></a></div>
      <div className="stats">{stats.map(s => <div key={s.label} className="stat card"><span className="ico"><Icon name={s.icon} /></span><b>{s.value}</b><small>{s.label}</small></div>)}</div>
    </div>
  </section>
)

const Doctors = () => {
  const track = useRef(null)
  const scroll = d => track.current?.scrollBy({ left: d * 280, behavior: 'smooth' })
  return (
    <section id="doctors" className="section alt">
      <div className="wrap">
        <div className="head-row">
          <div><span className="kicker">Meet Our</span><h2>Expert <em>Doctors</em></h2>
            <p className="lead">Our team of experienced and compassionate doctors is here to provide you with the best possible care, every step of the way.</p></div>
          <div className="row"><button className="circle" onClick={() => scroll(-1)} aria-label="Previous"><Icons.ChevronLeft size={16} /></button>
            <button className="circle" onClick={() => scroll(1)} aria-label="Next"><Icons.ChevronRight size={16} /></button></div>
        </div>
        <div className="doctors" ref={track}>
          {doctors.map(d => (
            <article key={d.name} className="doc card">
              <Photo src={d.img} label={d.name} />
              <div className="doc-b"><h3>{d.name}</h3><small>{d.role}</small>
                <span className="tag"><Icons.BadgeCheck size={12} /> {d.exp}</span>
                <a className="btn btn-outline btn-sm" href="#contact">View Profile <Icons.ArrowRight size={12} /></a></div>
            </article>))}
        </div>
      </div>
    </section>
  )
}

const Services = () => (
  <section id="services" className="section">
    <div className="wrap services">
      <div className="svc-img"><Photo label="Doctor with patient" /><span className="chip"><Icons.ShieldCheck size={14} /> Patient First<br /><b>Care Always</b></span></div>
      <div><h2>Comprehensive <em>Medical Services</em></h2>
        <p className="lead">We offer a wide range of healthcare services tailored to your needs — from routine checkups to advanced treatments.</p>
        <div className="svc-grid">{services.map(s => <div key={s.title} className="svc card"><span className="ico"><Icon name={s.icon} /></span><b>{s.title}</b><small>{s.text}</small></div>)}</div></div>
    </div>
  </section>
)

const CTA = () => (
  <section className="wrap"><div className="cta">
    <Photo label="Doctor at desk" className="cta-photo" />
    <div className="cta-txt"><h2>Choose Best Care for Your Health</h2>
      <p>Book your appointment today and take the first step towards a healthier, happier you. Our team is ready to provide the care you deserve.</p>
      <a className="btn btn-light" href="#contact"><Icons.CalendarDays size={16} /> Take an Appointment</a></div>
    <ul className="perks">{perks.map(p => <li key={p}><Icons.CheckCircle2 size={16} />{p}</li>)}</ul>
  </div></section>
)

const Reviews = () => (
  <section id="blog" className="section">
    <div className="wrap center"><span className="kicker">Testimonials</span><h2>What Our Patients Say About Us</h2>
      <p className="lead">Real stories from real people. Discover how we've helped our patients live healthier and happier lives.</p>
      <div className="reviews">{reviews.map(r => (
        <figure key={r.name} className="review card"><Icons.Quote className="q" size={18} />
          <div className="av" aria-hidden>{r.name[0]}</div>
          <figcaption><b>{r.name}</b><small>Patient</small></figcaption>
          <div className="stars">{[...Array(5)].map((_, i) => <Icons.Star key={i} size={12} fill="currentColor" />)}</div>
          <blockquote>"{r.text}"</blockquote><small className="date">{r.date}</small></figure>))}</div></div>
  </section>
)

const Location = () => (
  <section id="contact" className="section">
    <div className="wrap loc">
      <div className="loc-card"><h3><Icons.MapPin size={18} /> Our Location</h3>
        <p><Icons.Building2 size={15} /><span>125 Wellness Drive<br />Riverside, CA 92507</span></p>
        <p><Icons.Phone size={15} /><span>+1 (555) 246-9630</span></p>
        <p><Icons.Mail size={15} /><span>info@carewellclinic.com</span></p>
        <p><Icons.Clock size={15} /><span><b>Mon - Fri: 9:00 AM - 6:00 PM</b><br />Sat - Sun: 9:00 AM - 4:00 PM</span></p>
        <div className="emerg"><span>Need emergency assistance?</span><a className="btn btn-light btn-sm" href="tel:911">Call 911</a></div></div>
      <div className="map"><div className="pin"><b>CareWell Medical Clinic</b><small>125 Wellness Drive, Riverside, CA</small></div><span className="dot" />
        <div className="zoom"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div></div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="footer"><div className="wrap foot">
    <div><a className="logo" href="#home"><span className="logo-mark"><Icons.HeartPulse size={18} /></span><span>CareWell<small>Medical Clinic</small></span></a>
      <p>Healthier People, Happier Lives. Delivering personalized, compassionate, and expert healthcare support wherever you need it.</p></div>
    <div><h4>Quick Links</h4>{nav.slice(0, 5).map(n => <a key={n} href="#home">{n}</a>)}</div>
    <div><h4>Our Services</h4>{services.slice(0, 5).map(s => <a key={s.title} href="#services">{s.title}</a>)}</div>
    <div><h4>Get In Touch</h4><p><Icons.Phone size={13} /> +1 (555) 246-9630</p><p><Icons.Mail size={13} /> info@carewellclinic.com</p><p><Icons.MapPin size={13} /> 125 Wellness Drive, Riverside, CA 92507</p>
      <div className="social">{['Facebook', 'Twitter', 'Instagram', 'Linkedin'].map(n => <a key={n} href="#home" aria-label={n}><Icon name={n} size={13} /></a>)}</div></div>
  </div>
  <div className="wrap legal"><span>© 2026 CareWell Medical Clinic. All rights reserved.</span><span>Privacy Policy &nbsp; Terms &amp; Conditions</span></div></footer>
)

export default function App() {
  const [route, setRoute] = useState(location.hash)
  useEffect(() => { const h = () => { setRoute(location.hash); if (location.hash === '#/portal') scrollTo(0, 0) }; addEventListener('hashchange', h); return () => removeEventListener('hashchange', h) }, [])
  if (route === '#/portal') return <><Header /><Portal /></>
  return <><Header /><main><Hero /><About /><Doctors /><Services /><CTA /><Reviews /><Location /></main><Footer /></>
}
