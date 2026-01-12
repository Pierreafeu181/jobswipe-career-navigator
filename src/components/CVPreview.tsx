import React from "react";

interface CVPreviewProps {
  content: any;
}

export const CVPreview: React.FC<CVPreviewProps> = ({ content }) => {
  if (!content) return null;

  // --- Normalisation des données (Support Flat API & Nested Legacy) ---
  
  const contact_info = content.contact_info || {};
  
  const cvTitle = typeof content.cv_title === 'string' 
    ? content.cv_title 
    : content.cv_title?.cv_title || "";

  const role = cvTitle || contact_info.role || "";

  const objective = typeof content.objective === 'string'
    ? content.objective
    : content.objective?.objective || "";

  const experiences = Array.isArray(content.experiences)
    ? content.experiences
    : content.experiences?.experiences || [];

  const projects = Array.isArray(content.projects)
    ? content.projects
    : content.projects?.projects || [];

  const education = Array.isArray(content.education)
    ? content.education
    : content.education?.education || [];

  const skills = content.skills?.skills ? content.skills.skills : content.skills || {};
  
  const interests = Array.isArray(content.interests)
    ? content.interests
    : content.interests?.interests || [];

  // Styles inspirés de cv_generator.py pour reproduire le rendu xhtml2pdf
  const styles = {
    page: {
      fontFamily: "Helvetica, sans-serif",
      color: "#333",
      backgroundColor: "#fff",
      fontSize: "10pt",
      lineHeight: "1.3",
      padding: "48px", // ~1.27cm
      maxWidth: "21cm", // Largeur A4
      margin: "0 auto",
      boxShadow: "0 0 15px rgba(0,0,0,0.1)",
      minHeight: "29.7cm", // Hauteur A4
      boxSizing: "border-box" as const
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
    },
    headerTd: {
      borderBottom: "2px solid rgb(61, 90, 128)",
      paddingBottom: "5px",
      verticalAlign: "top",
    },
    h1: {
      fontSize: "24pt",
      margin: 0,
      fontWeight: "bold" as const,
    },
    role: {
      color: "rgb(61, 90, 128)",
      fontSize: "12pt",
      fontWeight: "bold" as const,
    },
    link: {
      color: "rgb(61, 90, 128)",
      textDecoration: "none",
    },
    section: {
      marginBottom: "8px",
    },
    h2: {
      color: "rgb(61, 90, 128)",
      textTransform: "uppercase" as const,
      fontSize: "12pt",
      borderBottom: "1px solid rgb(61, 90, 128)",
      paddingBottom: "0px",
      marginTop: "10px",
      marginBottom: "2px",
      fontWeight: "bold" as const,
    },
    subsection: {
      marginBottom: "5px",
    },
    subsectionTitle: {
      fontWeight: "bold" as const,
      fontSize: "10pt",
    },
    subsectionDates: {
      color: "#000",
      textAlign: "right" as const,
    },
    subsectionSubheader: {
      fontStyle: "italic" as const,
      color: "#000",
    },
    ul: {
      marginLeft: "15px",
      paddingLeft: 0,
      marginTop: "0px",
      marginBottom: "0px",
    },
    li: {
      marginBottom: "0px",
    },
    p: {
      marginTop: 0,
      marginBottom: "3px",
    }
  };

  const formatRichText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={{ ...styles.headerTd, width: "30%", textAlign: "left" }}>
              Email: <a href={`mailto:${contact_info.email}`} style={styles.link}>{contact_info.email}</a><br />
              Mobile: {contact_info.phone}<br />
              {contact_info.city}
            </td>
            <td style={{ ...styles.headerTd, width: "40%", textAlign: "center" }}>
              <h1 style={styles.h1}>{formatRichText(contact_info.name)}</h1>
              <div style={styles.role}>{formatRichText(role)}</div>
            </td>
            <td style={{ ...styles.headerTd, width: "30%", textAlign: "right" }}>
              Site web portfolio: <a href="https://the0eau.github.io/portfolio/" style={styles.link} target="_blank" rel="noreferrer">link</a><br />
              Github: <a href={`https://github.com/${contact_info.github}`} style={styles.link} target="_blank" rel="noreferrer">link</a><br />
              Linkedin: <a href={`https://www.linkedin.com/in/${contact_info.linkedin}`} style={styles.link} target="_blank" rel="noreferrer">link</a>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="cv-main">
        {/* Objectif */}
        {objective && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Objectif</h2>
            <p style={styles.p}>{formatRichText(objective)}</p>
          </div>
        )}

        {/* Expérience professionnelle */}
        {experiences.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Expérience professionnelle</h2>
            {experiences.map((exp: any, idx: number) => {
              const title = exp.target_title || exp.source_title || "";
              const dateStr = [exp.start_date, exp.end_date].filter(Boolean).join(" -- ");
              
              return (
                <div key={idx} style={styles.subsection}>
                  <table style={styles.table}>
                    <tbody>
                      <tr>
                        <td style={styles.subsectionTitle}>{formatRichText(title)}</td>
                        <td style={styles.subsectionDates}>{dateStr}</td>
                      </tr>
                      <tr style={styles.subsectionSubheader}>
                        <td><em>{formatRichText(exp.company)}</em></td>
                        <td style={{ textAlign: "right" }}><em>{formatRichText(exp.location)}</em></td>
                      </tr>
                    </tbody>
                  </table>
                  <ul style={styles.ul}>
                    {exp.bullets?.map((b: string, i: number) => (
                      b.trim() && <li key={i} style={styles.li}>{formatRichText(b.trim())}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Expérience en matière de leadership (Projets) */}
        {projects.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Expérience en matière de leadership</h2>
            {projects.map((proj: any, idx: number) => {
              const title = proj.target_title || proj.source_title || "";
              const techStack = (proj.tech_stack || []).join(", ");
              
              return (
                <div key={idx} style={styles.subsection}>
                  <table style={styles.table}>
                    <tbody>
                      <tr>
                        <td style={styles.subsectionTitle}>{formatRichText(title)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div><em>{formatRichText(techStack)}</em></div>
                  <ul style={styles.ul}>
                    {proj.bullets?.map((b: string, i: number) => (
                      b.trim() && <li key={i} style={styles.li}>{formatRichText(b.trim())}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Formation */}
        {education.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Formation</h2>
            {education.map((edu: any, idx: number) => {
              const dateStr = [edu.start_date, edu.end_date].filter(Boolean).join(" -- ");
              const mainText = [edu.school, edu.degree, edu.location].filter(Boolean).join(", ");
              const bullets = (edu.bullets || []).join(" ");

              return (
                <div key={idx} style={{ marginBottom: "2px" }}>
                  <table style={{ ...styles.table, marginBottom: "2px" }}>
                    <tbody>
                      <tr>
                        <td><strong>{formatRichText(mainText)}</strong></td>
                        <td style={{ textAlign: "right" }}>{dateStr}</td>
                      </tr>
                    </tbody>
                  </table>
                  {bullets && <p style={styles.p}>{formatRichText(bullets)}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Compétences */}
        {skills.sections && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Compétences</h2>
            {skills.sections.map((section: any, idx: number) => (
              <p key={idx} style={styles.p}>
                <strong>{formatRichText(section.section_title)}</strong> - {section.items?.join(", ")}.
              </p>
            ))}
          </div>
        )}

        {/* Activités */}
        {interests.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Activités</h2>
            {interests.map((it: any, idx: number) => (
              <table key={idx} style={{ ...styles.table, marginBottom: "2px" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "30%" }}><strong>{formatRichText(it.label)}</strong></td>
                    <td>{formatRichText(it.sentence)}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};