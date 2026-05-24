"use client";

import React from "react";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

const FOOTER_LINKS = [
  { id: "surya", label: "Surya", url: "https://www.linkedin.com/in/g-surya-prakash-0844a1317/" },
  { id: "pranay", label: "Pranay", url: "https://www.linkedin.com/in/pranay-p-12115b296?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
  { id: "sriraj", label: "Sri Raj", url: "https://www.linkedin.com/in/sri-raj-kumar-118545331/" },
];

export function Footer() {
  const pathname = usePathname();
  const showCredits = pathname === "/" || pathname === "/login";

  if (!showCredits) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.credits}>
          Made with <span className={styles.heart}>❤️</span> by{" "}
          {FOOTER_LINKS.map((link, index) => (
            <React.Fragment key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {link.label}
              </a>
              {index < FOOTER_LINKS.length - 1 && (
                index === FOOTER_LINKS.length - 2 ? " & " : ", "
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
