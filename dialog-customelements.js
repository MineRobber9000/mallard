if ('customElements' in window) {
    class CloseButton extends HTMLButtonElement {
        constructor() { super(); };
        
        connectedCallback() {
            let parentDialog = this.parentElement;
            while (parentDialog!==null && !(parentDialog instanceof HTMLDialogElement)) {
                parentDialog = parentDialog.parentElement;
            }
            if (parentDialog===null) throw new Error("dialog close button without parent dialog");
            this.addEventListener("click", () => parentDialog.close());
        };
    }
    
    customElements.define("dialog-close", CloseButton, {extends: "button"});
    
    class BangEditModal extends HTMLDialogElement {
        constructor() { super(); };
        
        connectedCallback() {
            this.form = this.querySelector("form");
            this.form.addEventListener("submit",(ev)=>{
                this.dispatchEvent(new CustomEvent(
                    "formsubmit",
                    {
                        detail: {
                            form: this.form,
                            cancel: (() => ev.preventDefault()),
                        }
                    }
                ));
            });
            this.querySelectorAll("button[is='dialog-close']").forEach((btn)=>{
                btn.addEventListener("click",()=>this.resetForm());
            });
        }
        
        resetForm() {
            this.form.reset();
        }
        
        loadBang(bang) {
            this.resetForm();
            Object.keys(bang).forEach((key)=>{
                if (key==="fmt") return;
                this.form.elements[key].value = bang[key];
            });
            if ("fmt" in bang) {
                this.form.querySelectorAll("ul input").forEach((i)=>(i.checked=false));
                bang.fmt.forEach((s)=>(this.form.elements[s].checked=true));
            }
        }
    }
    
    customElements.define("bang-edit",BangEditModal,{extends:"dialog"})
    
    class OpenLink extends HTMLAnchorElement {
        static observedAttributes = ["modal"];
        
        constructor() { super(); };
        
        connectedCallback() {
            this.setAttribute("href", "#");
            this.addEventListener("click", () => {
                if (this.modal!==null) this.modal.showModal();
            }, false);
        };
        
        attributeChangedCallback(name, oldValue, newValue) {
            if (name==="modal") {
                if (newValue===null) {
                    this.modal = null;
                    return;
                }
                let el = document.getElementById(newValue);
                if (el==null || !(el instanceof HTMLDialogElement)) {
                    this.modal = null;
                    throw new Error(`No such modal ${newValue}`);
                }
                this.modal = el;
            }
        }
    }
    
    customElements.define("modal-open", OpenLink, {extends: "a"});
    
} else {
    alert("your browser doesn't support customElements which means the whole UI is going to be screwed");
}