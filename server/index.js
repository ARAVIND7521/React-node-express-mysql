const express = require('express');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const db = require('./dbconnection');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Set Up Middleware
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
var username = null;
var token = null;
let user = null;
let OtpToken = null;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

app.post("/login/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    username = req.body.username;
    const password = req.body.password;
    const sql = "select UserDetails.EmpID, UserCredential.SecretID, UserDetails.First_Name, UserDetails.Last_Name, UserCredential.UserName, UserCredential.Password, UserDetails.Designation, UserDetails.DOJ, DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Address, UserDetails.Zipcode, UserDetails.Is_Active, UserCredential.MobileNo from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1 and username =? and password =?";
    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            const id = result;
            token = jwt.sign({ id }, "jwtSecret");
            res.cookie('token', token, { httpOnly: true, maxAge: 600000 });
            res.send({
                token,
                result
            });
        }
    });
});

app.post("/my_info/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const sql = "select UserDetails.EmpID, UserCredential.UserName, UserCredential.Password, UserCredential.SecretID, UserDetails.First_Name, UserDetails.Last_Name, UserDetails.DOB, UserDetails.Age, DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Designation, UserDetails.DOJ, UserDetails.Address, UserDetails.Zipcode, UserCredential.MobileNo, UserDetails.Is_Active, UserDetails.Profile from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1 and username = ?";
    res.setHeader("Content-Type", "text/plain");
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
})

app.post("/dashboard/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const sql = "select UserDetails.EmpID, UserDetails.First_Name, UserDetails.DOB, UserDetails.Age, UserDetails.Last_Name,  DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Designation, UserDetails.DOJ, UserDetails.Address, UserDetails.Zipcode, UserCredential.MobileNo, UserDetails.Is_Active, UserDetails.Profile from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

// app.post("/show_attendance/", (req, res) => {
//     res.setHeader('mysql', { "Content-Type": "text/plain" });
//     const empid = req.body.empid;
//     const empname = req.body.empname;
//     const mode = req.body.mode;
//     const datefrom = req.body.datefrom;
//     const dateto = req.body.dateto;
//     const sql = "select * from attendance_reports where EmpID = ? and EmpName = ? and mode = ? and date between ? and ?";
//     db.query(sql, [empid, empname, mode, datefrom, dateto], (err, result) => {
//         if (err) {
//             console.log(err);
//         } else {
//             res.send(JSON.stringify(result));
//         }
//     });
// });

app.post("/show-all-attendance/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const empid = req.body.empid;
    const empname = req.body.empname;
    const mode = req.body.mode;
    const status = req.body.status;
    const datefrom = req.body.datefrom;
    const dateto = req.body.dateto;
    let sql = "select * from attendance_reports where EmpID = ? and EmpName = ?";
    let sqlQuery;
    let values;
    if (mode) {
        if (status) {
            sqlQuery = sql + " and Status = ? and mode = ? and date between ? and ?"
            values = [empid, empname, status, mode, datefrom, dateto];
        } else {
            sqlQuery = sql + " and mode = ? and date between ? and ?";
            values = [empid, empname, mode, datefrom, dateto];
        }
    } else {
        if (status) {
            sqlQuery = sql + " and Status = ? and date between ? and ?"
            values = [empid, empname, status, datefrom, dateto];
        } else {
            sqlQuery = sql + " and date between ? and ?";
            values = [empid, empname, datefrom, dateto];
        }
    }
    db.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/team-attendance/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const date = req.body.date;
    const dateTo = req.body.dateTo;
    const designation = req.body.designation;
    let sql = "select * from attendance_reports LEFT JOIN userdetails ON attendance_reports.empid = userdetails.empid WHERE userdetails.Is_Active=1 AND date BETWEEN ? AND ?";
    let sqlQuery;
    let values;
    if (designation) {
        sqlQuery = sql + " AND attendance_reports.Designation = ?"
        values = [date, dateTo, designation];
    } else {
        sqlQuery = sql;
        values = [date, dateTo];
    }
    db.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
})

app.post("/show_attendance_details/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const empid = req.body.empid;
    const date = req.body.date;
    const dateTo = req.body.dateTo;
    let sql;
    let values;
    if (dateTo) {
        sql = "SELECT * FROM attendance_reports WHERE EmpID = ? AND date BETWEEN ? AND ?";
        values = [empid, date, dateTo];
    } else {
        sql = "SELECT * FROM attendance_reports WHERE EmpID = ? AND date = ?";
        values = [empid, date];
    }

    db.query(sql, values, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/attendance_status/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const status = "Pending";
    const sql = "select * from attendance_reports LEFT JOIN userdetails ON attendance_reports.empid = userdetails.empid WHERE userdetails.Is_Active=1 AND Status = ?";
    db.query(sql, [status], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/attendance_status_update/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": "text/plain" });
    const empid = req.body.empid;
    const date = req.body.date;
    const status_update = req.body.status_update;
    const attendance_status = req.body.attendance_status;
    let sql;
    let values;
    if (attendance_status == "Present") {
        sql = "update attendance_reports set Status = ?, attendance_status = ? where EmpID = ? and Date = ?";
        values = [status_update, attendance_status, empid, date]
    } else {
        sql = "update attendance_reports set Status = ?, attendance_status = ? where EmpID = ? and Date = ?";
        values = [status_update, attendance_status, empid, date]
    }
    db.query(sql, values, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/attendance/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const empid = req.body.empid;
    const empname = req.body.empname;
    const designation = req.body.designation;
    const dateFrom = req.body.dateFrom;
    const dateTo = req.body.dateTo;
    const mode = req.body.mode;
    const Status = "Pending";
    let sql;
    let values = [];
    insertQuery = "insert into attendance_reports(EmpID, EmpName, Designation, Date, Status, mode) values ?";
    sql = "SELECT DATEDIFF(" + dateTo + "," + dateFrom + ") AS day_difference";
    db.query("SELECT DATEDIFF(?, ?) AS day_difference", [dateTo, dateFrom], (err, result) => {
        if (err) {
            console.log(err);
            res.send("Error occurred.");
            return;
        }
        const dayDifference = result[0].day_difference;
        if (dayDifference >= 0) {
            for (let i = 0; i <= dayDifference; i++) {
                const currentDate = new Date(dateFrom);
                currentDate.setDate(currentDate.getDate() + i);
                if (moment(currentDate).day() !== 0) {
                    values.push([empid, empname, designation, currentDate.toISOString().split('T')[0], Status, mode]);
                }
            }

            db.query(insertQuery, [values], (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    res.send(JSON.stringify(result));
                }
            });
        }
    })
});

app.post("/search/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const username = req.body.username;
    const sql = "select UserDetails.EmpID, UserCredential.SecretID, UserDetails.First_Name, UserDetails.Last_Name, UserCredential.UserName, UserCredential.Password, UserDetails.Designation, UserDetails.DOJ, DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Address, UserDetails.Zipcode, UserDetails.Is_Active, UserCredential.MobileNo from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1 and UserName = ?"
    db.query(sql, username, (err, results) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(results));
        }
    });
})

app.post("/delete_record/", (req, res) => {
    const empid = req.body.empid;
    const empname = req.body.empname;
    const date = req.body.date;
    const sql = "delete from attendance_reports where EmpID= ? and EmpName = ? and Date = ?"
    db.query(sql, [empid, empname, date], (err, results) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(results));
        }
    });
});

app.post("/forget_psw/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const email = req.body.email;
    const username = req.body.username;
    var mailOptions = {};
    var otp = Math.random();
    otp = otp * 1000000;
    otp = parseInt(otp);
    const otpExpirationTime = 600;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'my1stcompany2001@gmail.com',
            pass: 'yauifmhmgschtpwt'
        }
    });

    let query = null;
    let queryParams = null;

    if (username) {
        query = "select UserDetails.EmpID, UserCredential.SecretID, UserDetails.First_Name, UserDetails.Last_Name, UserCredential.UserName, UserCredential.Password, UserCredential.Mail, UserDetails.Designation, UserDetails.DOJ, DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Address, UserDetails.Zipcode, UserDetails.Is_Active, UserCredential.MobileNo from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1 and UserName = ?";
        queryParams = [username];
    } else {
        query = "select UserDetails.EmpID, UserCredential.SecretID, UserDetails.First_Name, UserDetails.Last_Name, UserCredential.UserName, UserCredential.Password, UserCredential.Mail, UserDetails.Designation, UserDetails.DOJ, DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Address, UserDetails.Zipcode, UserDetails.Is_Active, UserCredential.MobileNo from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID where Is_Active = 1 and UserName = ?";
        queryParams = [email];
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        user = results[0];

        mailOptions = {
            from: 'my1stcompany2001@gmail.com',
            to: user.Mail,
            subject: "OTP SEND BY COMPANY",
            html: "<h3>OTP FOR FORGET PASSWORD</h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>" // html body
        };

        const updateQuery = "UPDATE usercredential SET OTP = ? WHERE EmpID = ?";
        const updateParams = [otp, user.EmpID];

        db.query(updateQuery, updateParams, (err) => {
            if (err) {
                console.log(err);
            }
            const id = user.EmpID;
            OtpToken = jwt.sign({ id }, "jwtSecret");
            res.cookie('OtpToken', OtpToken, { httpOnly: true, maxAge: 600000 });

            transporter.sendMail(mailOptions, function (error, result) {
                if (error) {
                    console.log(error);
                    return res.status(500).send("Error sending OTP email");
                }

                res.send({
                    OtpToken,
                    results,
                    otpExpirationTime
                });
            });
        });
    });
});

app.post("/forget_psw/otp_generate/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const otp = req.body.otp;
    const sql = "select * from usercredential where OTP = ?";
    db.query(sql, [otp], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/forget_psw/change_psw/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const newpassword = req.body.newpassword;
    const sql = "update usercredential set Password = ? where empid = ?";
    db.query(sql, [newpassword, user.EmpID], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            user = null;
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/change_newPassword/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const newpassword = req.body.newpassword;
    const currentpassword = req.body.currentpassword;
    const sql = "update usercredential set Password = ? where UserName =? and Password = ?";
    db.query(sql, [newpassword, username, currentpassword], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.post("/add&show_employee/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const empid = req.body.empid;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const experience = req.body.experience;
    const designation = req.body.designation;
    const dob = req.body.dob;
    const age = req.body.age;
    const doj = req.body.doj;
    const dod = req.body.dod;
    const address = req.body.address;
    const zipcode = req.body.zipcode;
    const is_active = 1;
    const username = req.body.username;
    const password = req.body.password;
    const mobileno = req.body.mobileno;
    const otp = "NULL";
    const mail = req.body.mail;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'my1stcompany2001@gmail.com',
            pass: 'yauifmhmgschtpwt'
        }
    });
    const sql = "insert into userdetails(EmpID, First_Name, Last_Name, DOB, Age, Experience, Designation, DOJ, DOD, Address, Zipcode, Is_Active) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const sql1 = "insert into usercredential(EmpID, UserName, Password, MobileNo, OTP, Mail) values(?, ?, ?, ?, ?, ?)";
    db.query(sql, [empid, firstname, lastname, dob, age, experience, designation, doj, dod, address, zipcode, is_active], (err, result) => {
        if (err) {
            console.log(err);
        }
        res.send(JSON.stringify(result));
    });

    db.query(sql1, [empid, username, password, mobileno, otp, mail], (err) => {
        if (err) {
            console.log(err);
        } else {
            var mailOptions = {
                from: 'my1stcompany2001@gmail.com',
                to: mail,
                subject: "CREDENTIAL SEND BY COMPANY",
                html: "<h1>YOUR LOGIN CREDENTIAL</h1>" + "<h3 style='font-weight:bold;'> USERNAME : " + username + "<h3 style='font-weight:bold;'> PASSWORD : " + password + "</h3>" // html body
            };

            transporter.sendMail(mailOptions, function (error, result) {
                if (error) {
                    console.log(error);
                } else {
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});

app.post("/upload/", upload.single('image_file'), (req, res) => {
    const empid = req.body.empid;
    const profile = req.file.filename;
    const sql = "update userdetails set profile = ? where EmpID =?"
    db.query(sql, [profile, empid], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
})

app.get("/:universalURL", (req, res) => {
    res.send("404 URL NOT FOUND");
});

app.post("/remove_employee/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const removeid = req.body.removeid;
    const active = 0;
    const date = req.body.date;
    const secretcode = req.body.secretcode;
    const adminpass = req.body.adminpass;
    const sql = "update UserCredential, userdetails set Is_Active = ?, DOD = ? where Is_Active = 1 and Userdetails.EmpID =? and SecretID =? and Password =?";
    db.query(sql, [active, date, removeid, secretcode, adminpass], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
});

app.post("/attendance_list/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const sql = "select UserDetails.EmpID, attendance_reports.EmpName, attendance_reports.Designation, attendance_reports.Date, attendance_reports.Status, attendance_reports.mode, attendance_reports.attendance_status  from UserDetails inner join attendance_reports on UserDetails.EmpID = attendance_reports.EmpID where Is_Active = 1";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
})

app.post("/absentees_list/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const date = req.body.date;
    const attendance_status = req.body.attendance_status;
    let sql;
    let params;

    if (attendance_status === "Present") {
        // Query for present members
        sql = "SELECT userdetails.empid, userdetails.First_name, userdetails.last_name, attendance_reports.date, attendance_reports.status, attendance_reports.mode FROM userdetails LEFT JOIN attendance_reports ON userdetails.empid = attendance_reports.empid AND attendance_reports.date=? WHERE attendance_reports.attendance_status='Present' AND userdetails.Is_Active=1";
        params = [date];
    } else if (attendance_status === "Absent") {
        // Query for absent members
        sql = "SELECT userdetails.empid, userdetails.First_name, userdetails.last_name, attendance_reports.date, attendance_reports.status, attendance_reports.mode FROM userdetails LEFT JOIN attendance_reports ON userdetails.empid = attendance_reports.empid AND attendance_reports.date=? WHERE attendance_reports.attendance_status='Absent' AND userdetails.Is_Active=1";
        params = [date];
    } else {
        sql = "SELECT userdetails.empid, userdetails.First_name, userdetails.last_name, attendance_reports.date, attendance_reports.status, attendance_reports.mode FROM userdetails LEFT JOIN attendance_reports ON userdetails.empid = attendance_reports.empid AND attendance_reports.date=? WHERE userdetails.Is_Active=1";
        params = [date];
    }
    db.query(sql, [params], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
});

app.post("/birth_date/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const sql = "SELECT * FROM  userdetails WHERE Is_Active=1 AND DATE_FORMAT( CONCAT(YEAR(CURDATE()),'-',DATE_FORMAT(DOB, '%m-%d') ), '%Y-%m-%d') BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 MONTH) order by DAYOFYEAR(DOB) < DAYOFYEAR(CURDATE()),DAYOFYEAR(DOB)";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
});

app.post("/edit_employee/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const empid = req.body.empid;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const designation = req.body.designation;
    const DOB = req.body.DOB;
    const Age = req.body.Age;
    const address = req.body.address;
    const zipcode = req.body.zipcode;
    const mobileno = req.body.mobileno;
    const mail = "my1stcompany2001@gmail.com";
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'my1stcompany2001@gmail.com',
            pass: 'yauifmhmgschtpwt'
        }
    });
    const sql = "update userdetails set First_Name = ?, Last_Name = ?, Designation = ?, DOB = ?, Age = ?, Address = ?, Zipcode = ? where empid =?";
    const sql1 = "update usercredential set MobileNo = ? where EmpID =?"
    db.query(sql, [firstname, lastname, designation, DOB, Age, address, zipcode, empid], (err) => {
        if (err) {
            console.log(err);
        }

        db.query(sql1, [mobileno, empid], (err) => {
            var mailOptions = {
                from: 'my1stcompany2001@gmail.com',
                to: mail,
                subject: "UPDATE YOUR PROFILE BY COMPANY",
                html: "<h1>YOUR USER DATA</h1>" + "<h3 style='font-weight:bold;'> NOW YOUR EMPLOYEE NAME IS : </h3>" + "<h4 style='font-weight:bold; color:red;'>" + firstname + " " + lastname + "</h4>"
                    + "<h3 style='font-weight:bold;'> NOW YOUR DESIGNATION IS : </h3>" + "<h4 style='font-weight:bold; color:red;'>" + designation + "</h4>"
                    + "<h3 style='font-weight:bold;'> NOW YOUR DATE OF BIRTH IS : </h3>" + "<h4 style='font-weight:bold; color:red;'>" + DOB + "</h4>"
                    + "<h3 style='font-weight:bold;'> NOW YOUR ADDRESS AND ZIPCODE IS : </h3>" + "<h4 style='font-weight:bold; color:red;'>" + address + "-" + zipcode + "</h4>"
                    + "<h3 style='font-weight:bold;'> NOW YOUR MOBILE NUMBER IS : </h3>" + "<h4 style='font-weight:bold; color:red;'>" + mobileno + "</h4>"
                    + "<h3 style='font-weight:bold;'> More details please visit :</h3>" + "<h4 style='font-weight:bold; color:red;'>" + "https://aravind7521.github.io/workForceHub/" + "</h4>"// html body
            };

            transporter.sendMail(mailOptions, function (error, result) {
                if (err) {
                    console.log(err);
                } else {
                    res.send(JSON.stringify(result));
                }
            });
        });
    });
});

app.post("/uploading/", upload.single('image_file_2'), (req, res) => {
    const empid = req.body.empid;
    const profile = req.file.filename;
    const sql = "update userdetails set profile = ? where EmpID =?"
    db.query(sql, [profile, empid], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    })
})

app.post("/find/", (req, res) => {
    res.setHeader('mysql', { "Content-Type": 'application/json' });
    const sql = "select UserDetails.EmpID, UserDetails.First_Name, UserDetails.Last_Name,  DATEDIFF(CURDATE(), DOJ)/365 as Experience, UserDetails.Designation, UserDetails.DOJ, UserDetails.Address, UserDetails.Zipcode, UserCredential.MobileNo, UserDetails.Is_Active, UserDetails.Profile from UserDetails inner join UserCredential on UserDetails.EmpID = UserCredential.EmpID";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(result));
        }
    });
});

app.listen(PORT, console.log(`Server started on port ${PORT}`));