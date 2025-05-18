when this app was first devised the challenge i set myself was to make this a single-html. that broader design goal remains.

the broader design goal is now to have two distinct versions of the app, the single-html version (which pulls down all the components it needs during startup), and a new linux shell-based package that is designed to run within an IDE and executed at the command-line.

It is critical that we re-use as much of the existing code as possible from the html version for the shell version, and that reusability will continue to be a design requirement going forward.

I also want to make the project more manageable by identifying what are the main functions of the core javascript logic (i.e., pdf generation), and isolating these as seperate file components that are at first retrieved by, and then used by the html or shell-app, as per how other libraries are downloaded currently in the html version.