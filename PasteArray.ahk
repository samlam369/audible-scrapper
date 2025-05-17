#Requires AutoHotkey v2.0+

; Define global variables
Global currentIndex := 1
Global myArray := []

; Define the hotkey (Alt+Q)
!q:: {
    global currentIndex, myArray  ; Declare globals inside the function
    
    ; Check if the current index is within the bounds of the array
    if (currentIndex <= myArray.Length) {
        ; Send the current string from the array
        SendText(myArray[currentIndex])
        ; Increment the index for the next press
        currentIndex++
    } else {
        ; Reset index if we reach the end of the array
        ; currentIndex := 1
    }
}

; Define the hotkey (Alt+W) to resend the previous item
!w:: {
    global currentIndex, myArray  ; Declare globals inside the function
    
    ; Check if we can go back one position (currentIndex is 2 or higher)
    if (currentIndex > 1) {
        ; Send the previous string from the array
        SendText(myArray[currentIndex - 1])
    }
}