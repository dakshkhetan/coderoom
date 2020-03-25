import React from "react";
import random from "random-key";
import CodeMirror from "react-codemirror";
import Header from "../../components/Header/Header";
import SideDrawer from '../../components/SideDrawer/SideDrawer';
import Backdrop from '../../components/Backdrop/Backdrop';
import { database } from "firebase/app";
import { firebaseAuth } from "../../config/firebase-config";
import { logout } from "../../helpers/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { faToggleOn } from '@fortawesome/free-solid-svg-icons';
import { faToggleOff } from '@fortawesome/free-solid-svg-icons';

import "codemirror/lib/codemirror";
import "codemirror/lib/codemirror.css";
import 'codemirror/mode/xml/xml';
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/edit/trailingspace';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/javascript-hint';
import 'codemirror/addon/comment/comment';

const appTokenKey = "appToken";
const sessionID = "sessionID";
const usersList = [];
const creatorInfo = {};

export default class CodingPage extends React.Component {

  constructor(props) {
      super(props);

      const session_id = this.props.match.params.sessionid;

      // if appTokenKey is not found in localStorage,
      // then redirect to login page
      if (!localStorage.getItem(appTokenKey)) {
        localStorage.setItem("sessionID", session_id);
        this.props.history.push(`/login`);
        return;
      }

      // setting initial state
      this.state = {
          key: random.generate(3), // for storing connected-users
          readOnly: false,
          isCreator: false,
          sideDrawerOpen: false,
          code: "Loading...",
          cursorPosition: {
            line: 0,
            ch: 0
          },
      };

      // set 'readOnly' state from database
      database()
      .ref(`code-sessions/${session_id}`)
      .once("value")
      .then(snapshot => {
        var readOnly = snapshot.val().readOnly;
        this.setState({ readOnly: readOnly });
      })
      .catch(e => {
        // no session found corresponding to "sessionid" passed in the params
      });

      this.handleLogout = this.handleLogout.bind(this);

  }

  // setting initial state
  state = {
    sideDrawerOpen: false,
    code: "Loading...",
    cursorPosition: {
      line: 0,
      ch: 0
    },
  };

  componentDidMount = () => {

    const { params } = this.props.match;
    const session_id = params.sessionid;

    // to fetch currently signed-in user
    firebaseAuth().onAuthStateChanged(async (user) => {
      try {
        if (user) {

          var creator_uid;

          // fetch session creator's uid from database
          // const creator_uid = await database()
          await database()
          .ref(`code-sessions/${session_id}/creator`)
          .once("value")
          .then(snapshot => {
            var creatorData = snapshot.val();
            creator_uid = creatorData.user_id;
            creatorInfo.user_name = creatorData.user_name;
            creatorInfo.user_photo = creatorData.user_photo;
            // console.log(creatorData);
          })
          .catch(e => {
            // no session found corresponding to "sessionid" passed in the params
          });

          if (creator_uid === undefined ){
            console.log("No Session Found!");
            return;
          }

          // do not add user details to 'users-connected'
          // if that user is the creator of session
          if (user.uid !== creator_uid){

              console.log("Current user is NOT the session creator");
              console.log("User added to 'users-connected'");
              
              var newUser;

              // checking if user already present in database
              await database()
              .ref(`code-sessions/${session_id}/users-connected`)
              .once("value")
              .then(snapshot => {
                snapshot.forEach(function(childSnapshot){
                  var userData = childSnapshot.val();
                  if(userData.user_id === user.uid){
                    newUser = false;
                    console.log("User details already present in the database");
                  }
                });
                if(newUser !== false){
                  newUser = true;
                }
              })
              .catch(e => {
                console.log(e);
              });

              // adding new user details in database
              if(newUser === true){
                console.log("User details added to the database");
                await database()
                .ref(`code-sessions/${session_id}/users-connected/user-` + this.state.key)
                .set({
                  user_id: user.uid,
                  user_name: user.displayName,
                  user_email: user.email,
                  user_photo: user.photoURL
                });
              }

          } else {
            console.log("Current user is the session creator");
            console.log("User NOT added to 'users-connected'");
            this.setState({ isCreator: true });
          }

          // displaying users-connected from database
          database()
          .ref(`code-sessions/${params.sessionid}/users-connected`)
          .on('value', snapshot => {
            console.log("\nConnected users: ");
            usersList.splice(0, usersList.length);
            var i = 0;
            snapshot.forEach(function(childSnapshot){
              var userData = childSnapshot.val();
              console.log(userData.user_name + " - " + userData.user_email);
              usersList.push(
                <li key={i}>
                  <img src={userData.user_photo} alt="Avatar" />
                  <span>{userData.user_name}</span>
                </li>
              );
              i++;
            });
            console.log("\n");
          });

          // making the users-editing-state button dynamic
          database()
          .ref(`code-sessions/${params.sessionid}`)
          .on('value', snapshot => {
            // console.log("readOnly changed!");
            if(this.userEditingToggleBtn !== null){
              let readOnlyState = snapshot.val().readOnly;
              if(readOnlyState){
                this.userEditingToggleBtn.innerHTML = "Editing: Disabled";
              } else {
                this.userEditingToggleBtn.innerHTML = "Editing: Enabled";
              }
            }
          });

        } else {
          console.log("Cannot fetch currently signed-in user!");
        }
      } catch(error) {
        console.log("Error in authentication:", error);
      }
    });

    let self = this;
    database()
    .ref("/code-sessions/" + params.sessionid)
    .once("value")
    .then(snapshot => {

      // trimmimg the Date() to remove unnecessary add-ons
      var createdOn = snapshot.val().createdon;
      var createdOnCompressed = createdOn.substring(0, 25);
      self.setState({ code: snapshot.val().content + "", createdon: createdOnCompressed }, () => {
        // fetching content from db and setting on the editor
        let content = snapshot.val().content;
        self.codemirror.getCodeMirror().setValue(content);
        // console.log(this.codemirror.getCodeMirror());
      });
        
      // whenever changes are made:
      // "code" is updated from the db
      // cursor position is updated (changeCursorPos() is called)
      // code on the editor screen is updated from the db
      this.codeRef = database().ref("code-sessions/" + params.sessionid);
      this.codeRef.on("value", function(snapshot) {
        self.setState({
          code: snapshot.val().content
        });
        var currentCursorPos = self.state.cursorPosition;
        self.codemirror.getCodeMirror().setValue(snapshot.val().content);
        self.setState({ cursorPosition: currentCursorPos });
        self.changeCursorPos();

        // setting 'readOnly' option
        if(self.state.isCreator){
          self.codemirror.getCodeMirror().setOption("readOnly", false);
        } else {
          self.codemirror.getCodeMirror().setOption("readOnly", snapshot.val().readOnly);
        }

      });

    })
    .catch(e => {
      // no session found corresponding to "sessionid" passed in the params
      self.codemirror.getCodeMirror().setValue("No Sessions Found!");
    });

  };

  // updating cursor position
  changeCursorPos = () => {
    const { line, ch } = this.state.cursorPosition;
    this.codemirror.getCodeMirror().doc.setCursor(line, ch);
  };

  // called whenever code is changed
  onChange = (newVal, change) => {
    // console.log(newVal, change);
    this.setState({
        cursorPosition: {
          line: this.codemirror.getCodeMirror().doc.getCursor().line,
          ch: this.codemirror.getCodeMirror().doc.getCursor().ch
        }
      },
      () => {}
    );
    // updating data in database
    this.codeRef.child("content").set(newVal);
  };

  // sign-out functionality
  handleLogout() {
    logout().then(function () {
        localStorage.removeItem(appTokenKey);
        localStorage.removeItem(sessionID);
        this.props.history.push("/login");
        console.log("User signed-out from firebase.");
    }.bind(this));
  }

  // sidebar toggle handler
  drawerToggleClickHandler = () => {
    this.setState((prevState) => {
      return { sideDrawerOpen: !prevState.sideDrawerOpen };
    });
  };

  // backdrop (dull background) handler
  backdropClickHandler = () => {
    this.setState({ sideDrawerOpen: false });
  };
 
  // read only toggle handler
  toggleReadOnly = () => {
    this.setState({
			readOnly: !this.state.readOnly
    }, () => this.codemirror.focus());
    // updating readOnly in database
    this.codeRef.child("readOnly").set(!this.state.readOnly);
  };

  render() {

    let backdrop;
    if (this.state.sideDrawerOpen) {
      backdrop = <Backdrop click={this.backdropClickHandler} />
    }

    // readOnly toggle is only displayed when current user is the creator of session
    let readOnlyToggle;
    if (this.state.isCreator) {
      readOnlyToggle = 
        <button 
          className="btn-coding margin-l-10" 
          onClick={this.toggleReadOnly}>
            {this.state.readOnly 
            ? <FontAwesomeIcon icon={faToggleOn} /> 
            : <FontAwesomeIcon icon={faToggleOff} />}
        </button>
    }

    // this button is only displayed to the users-connected (not the creator)
    let userEditingToggle;
    if (!this.state.isCreator) {
      userEditingToggle = 
        <button
          ref={button => {
            this.userEditingToggleBtn = button;
          }}
          className="btn-coding margin-l-10" 
          onClick={null}>
            {this.state.readOnly 
            ? 'Editing: Disabled' 
            : 'Editing: Enabled'}
        </button>
    }

    return (
      <React.Fragment>

        <Header
          style={{ background: "#1d1f27" }}
          extras={
            <div>
              {this.state.createdon
                ? `Created On: ${this.state.createdon}`
                : ""}
              { readOnlyToggle }
              { userEditingToggle }
              <button className="btn-coding margin-l-10" onClick={this.handleLogout}>
                Sign Out
              </button>
              <button className="btn-coding margin-l-10" onClick={this.drawerToggleClickHandler}>
                <FontAwesomeIcon icon={faBars} />
              </button>
            </div>
          }
        />

        <SideDrawer show={this.state.sideDrawerOpen} session_id={this.props.match.params.sessionid} />
        { backdrop }
        
        <div className="coding-page">
          <CodeMirror
            ref={r => (this.codemirror = r)}
            className="code-mirror-container"
            value={this.state.code}
            onChange={this.onChange}
            options={{
              mode: "xml",
              theme: "dracula",
              lineNumbers: true,
              autoCloseTags: true,
              matchBrackets: true,
              autoCloseBrackets: true,
              matchTags: true,
              showTrailingSpace: true,
              extraKeys: {
                  'Ctrl-Space' : 'autocomplete',
                  'Cmd-/' : 'toggleComment',
                  'Ctrl-/' : 'toggleComment'
              }
            }}
          />
        </div>
      </React.Fragment>
    );
  }

}

// exporting connected-users list
export {usersList};

// exporting creator info object
export {creatorInfo};