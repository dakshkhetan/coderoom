import React from "react";
import { Link } from "react-router-dom";
import logo from "../../images/CNLOGO.svg";

type Props = {
  style: React.CSSProperties,
  title: React.ReactHTML,
  extras: React.ReactHTML,
};

const Header = (props: Props) => {
  return (
    <header style={props.style} className="App-header">
      <Link className="App-title" to="/home">
        Code Room |{" "}
        <img className="logo-header" src={logo} alt="Coding Ninjas" />
      </Link>
      <div>{props.title}</div>
      <div className="extras">{props.extras}</div>
    </header>
  );
};

export default Header;
