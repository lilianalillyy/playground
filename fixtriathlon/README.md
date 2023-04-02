## fixtriathlon

My fuckfix for Logitech M720 Triathlon, which was triggering keys on left click. Solution? Disable it's virtual keyboard.
This means that the buttons cannot be mapped to keyboard (though if the keys are different than the ones triggered on left click, you can fuck around with the xinput command/bash script)


### fixmouse.sh

This is the script we're gonna run when the mouse get connected and detected by `udev` (you can also run it manually if needed):

```bash
ID=$(xinput --list | grep M720.*Keyboard | sed -E 's/.*id=([0-9]+).*/\1/g');
OUT=$(xinput disable $ID 2>&1);
LOG="/home/liliana/fixmouse.log";

if [ -n "${LOG}" ]; then
    echo $(date) >> $LOG;
    echo "id: $ID" >> $LOG;
    echo $OUT >> $LOG;
    echo "" >> fixmouse.log;
fi


# xinput disable $(xinput --list | grep M720.*keyboard | sed -E 's/.*id=([0-9]+).*/\1/g')
``

The important part is only the first two lines, which can technically be written as one (see the commented out line), but fuck it.
I recommend saving this script in your home folder, eg. `/home/liliana/fixmouse.sh`, though the location is up to you.

Change the LOG value in the script to the path of where the script will log when it's triggered (you can disable it by either setting LOG to NULL, or removing all the lines after LOG definition, including the definition).

Now just set permissions (run as root/sudo):
```bash
$ chmod +x /home/liliana/fixmouse.sh
```

### udev event

Create a file (as a root) in the `/etc/udev/rules.d` directory named `80-triathlon.conf` (the name is irrelevant but it's important to not set the number too low).

This is the entry we'll be using:

```udev
ACTION=="add", ATTRS{id/vendor}=="046d", ATTRS{id/product}=="b015", ENV{DISPLAY}=":0", ENV{XAUTHORITY}="/home/liliana/.Xauthority", RUN+="/bin/bash /home/liliana/fixmouse.sh > /home/liliana/fixmouse_udev.log 2>&1"
```

The vendor and product id are matching the M720, you may change it if you want to use a different device, your research is required for that though.
We also set the environment variables DISPLAY and XAUTHORITY there, which are required for xinput to work. The value should match the output of following commands

#### XAUTHORITTY:

```bash
echo $XAUTHORITY
```

#### DISPLAY:

```bash
echo $DISPLAY
```

Then just save this to the file you created and restart. While you can technically reload udev, it's more reliable to reboot it.
